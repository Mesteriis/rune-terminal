import type { RuntimeEnvironment, RuntimePlatform } from "./types";

const TAURI_RUNTIME_MARKERS = ["__TAURI__", "__TAURI_INTERNALS__"];

function getWindowGlobal(): { [key: string]: unknown } | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as unknown as { [key: string]: unknown };
}

export function hasBrowserWindow(): boolean {
  return typeof window !== "undefined";
}

export function isTauriRuntime(): boolean {
  const w = getWindowGlobal();
  if (w == null) {
    return false;
  }
  return TAURI_RUNTIME_MARKERS.some((marker) => w[marker] != null);
}

function resolveViteMode(): string {
  if (typeof import.meta === "undefined" || import.meta.env == null) {
    return "";
  }
  if (import.meta.env.MODE) {
    return String(import.meta.env.MODE);
  }
  return "";
}

function resolveNodeMode(): string {
  if (typeof process === "undefined" || process.env == null) {
    return "";
  }
  return process.env.NODE_ENV ?? "";
}

function resolveBrowserHostHint(): boolean {
  if (!hasBrowserWindow()) {
    return false;
  }
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function detectRuntimeEnvironment(): RuntimeEnvironment {
  const isTauri = isTauriRuntime();
  const isDev = resolveViteMode() === "development" || resolveViteMode() === "dev" || resolveNodeMode() === "development" || resolveBrowserHostHint();
  const platform: RuntimePlatform = isTauri ? "tauri" : "web";

  return {
    isTauri,
    isDev,
    platform,
  };
}
