import type { RuntimeConfig } from "./types";
import { detectRuntimeEnvironment, hasBrowserWindow, isTauriRuntime } from "./environment";
import { buildRuntimeTerminalStreamUrl } from "./stream";
import { resolveRuntimeConfig } from "./config";

export interface BootstrapResult {
  config: RuntimeConfig;
}

export async function bootstrapRuntime(): Promise<BootstrapResult> {
  const config = await resolveRuntimeConfig();
  return { config };
}

export function resolveTerminalStreamUrl(config: RuntimeConfig, widgetId: string, from?: number): string {
  return buildRuntimeTerminalStreamUrl(config, widgetId, { from });
}

export function getRuntimeContext() {
  const env = detectRuntimeEnvironment();
  return {
    isTauri: isTauriRuntime() && env.isTauri,
    isDev: env.isDev,
    hasWindow: hasBrowserWindow(),
  };
}
