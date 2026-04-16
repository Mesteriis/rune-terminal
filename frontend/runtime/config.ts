import {
  RuntimeResolutionError,
  type EnvConfigValue,
  type RuntimeConfig,
  type RuntimeConfigSource,
  type RuntimeResolutionAttempt,
  type StreamAuthMode,
  type TauriRuntimeInfo,
} from "./types";
import { detectRuntimeEnvironment, isTauriRuntime } from "./environment";

const VITE_API_BASE = "VITE_RTERM_API_BASE";
const VITE_API_TOKEN = "VITE_RTERM_AUTH_TOKEN";
const LEGACY_API_BASE = "WAVE_SERVER_WEB_ENDPOINT";
const LEGACY_AUTH_TOKEN = "RTERM_AUTH_TOKEN";
const LEGACY_RUNTIME_FALLBACK_FLAG = "VITE_RTERM_ENABLE_LEGACY_RUNTIME_FALLBACK";

export function detectStreamAuthMode(authToken: string | undefined): StreamAuthMode {
  return authToken ? "authorization-header" : "none";
}

export function readEnvValue(key: string): EnvConfigValue {
  if (typeof import.meta !== "undefined" && import.meta.env != null) {
    const value = (import.meta.env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return { value: value.trim(), source: "import.meta.env" };
    }
  }

  if (typeof process !== "undefined" && process.env != null) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return { value: value.trim(), source: "process.env" };
    }
  }

  return {};
}

function readBooleanEnvFlag(key: string): boolean {
  const raw = readEnvValue(key).value;
  if (raw == null) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }
  return `http://${trimmed}`;
}

function makeRuntimeConfig(
  baseUrl: string,
  authToken: string | undefined,
  source: RuntimeConfigSource,
  isTauri: boolean,
  isDev: boolean,
): RuntimeConfig {
  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    authToken,
    isTauri,
    isDev,
    streamAuthMode: detectStreamAuthMode(authToken),
    source,
  };
}

async function resolveFromTauri(attempts: RuntimeResolutionAttempt[]): Promise<RuntimeConfig | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const env = detectRuntimeEnvironment();
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const info = (await invoke<TauriRuntimeInfo>("runtime_info")) as TauriRuntimeInfo;
    if (!info || !info.base_url) {
      attempts.push({
        source: "tauri-command",
        message: "runtime_info returned empty base URL",
      });
      return null;
    }
    return makeRuntimeConfig(info.base_url, info.auth_token, "tauri-command", true, env.isDev);
  } catch (error) {
    attempts.push({
      source: "tauri-command",
      message: String(error),
    });
    return null;
  }
}

function resolveFromViteEnv(attempts: RuntimeResolutionAttempt[]): RuntimeConfig | null {
  const env = detectRuntimeEnvironment();
  const base = readEnvValue(VITE_API_BASE);
  if (base.value == null) {
    attempts.push({
      source: "vite-env",
      message: `missing ${VITE_API_BASE}`,
    });
    return null;
  }

  const token = readEnvValue(VITE_API_TOKEN).value;
  return makeRuntimeConfig(base.value, token, "vite-env", false, env.isDev);
}

function resolveFromLegacyWaveEnv(attempts: RuntimeResolutionAttempt[]): RuntimeConfig | null {
  const env = detectRuntimeEnvironment();
  const base = readEnvValue(LEGACY_API_BASE);
  if (base.value == null) {
    attempts.push({
      source: "legacy-wave-env",
      message: `missing ${LEGACY_API_BASE}`,
    });
    return null;
  }

  const token = readEnvValue(LEGACY_AUTH_TOKEN).value;
  return makeRuntimeConfig(base.value, token, "legacy-wave-env", false, env.isDev);
}

function resolveFromLocationOrigin(attempts: RuntimeResolutionAttempt[]): RuntimeConfig | null {
  if (typeof window === "undefined") {
    attempts.push({
      source: "location-origin",
      message: "window not available for location-origin resolution",
    });
    return null;
  }

  if (!window.location?.origin) {
    attempts.push({
      source: "location-origin",
      message: "window.location.origin missing",
    });
    return null;
  }

  const env = detectRuntimeEnvironment();
  return makeRuntimeConfig(window.location.origin, undefined, "location-origin", false, env.isDev);
}

export async function resolveRuntimeConfig(): Promise<RuntimeConfig> {
  const attempts: RuntimeResolutionAttempt[] = [];
  const env = detectRuntimeEnvironment();

  const fromTauri = await resolveFromTauri(attempts);
  if (fromTauri != null) {
    return fromTauri;
  }

  if (!env.isTauri) {
    const fromVite = resolveFromViteEnv(attempts);
    if (fromVite != null) {
      return fromVite;
    }

    const allowLegacyFallback = readBooleanEnvFlag(LEGACY_RUNTIME_FALLBACK_FLAG);
    if (allowLegacyFallback) {
      const fromLegacy = resolveFromLegacyWaveEnv(attempts);
      if (fromLegacy != null) {
        return fromLegacy;
      }

      const fromLocation = resolveFromLocationOrigin(attempts);
      if (fromLocation != null) {
        return fromLocation;
      }
    } else {
      attempts.push({
        source: "legacy-wave-env",
        message: `legacy fallback disabled (set ${LEGACY_RUNTIME_FALLBACK_FLAG}=1 to enable)`,
      });
      attempts.push({
        source: "location-origin",
        message: `location-origin fallback disabled (set ${LEGACY_RUNTIME_FALLBACK_FLAG}=1 to enable)`,
      });
    }
  }

  throw new RuntimeResolutionError("unable to resolve frontend runtime base URL", attempts);
}
