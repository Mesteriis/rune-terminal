import type { RuntimeConfig } from "./types";
import type { StreamAuthMode } from "./types";

export interface TerminalStreamUrlOptions {
  from?: number;
  includeQueryToken?: boolean;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = (baseUrl || "").trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function applyFromQueryParam(url: URL, from?: number): void {
  if (from == null) {
    return;
  }
  url.searchParams.set("from", String(from));
}

function applyTokenQueryParam(url: URL, token?: string, include = true): void {
  if (!include || !token) {
    return;
  }
  url.searchParams.set("token", token);
}

export function buildRuntimeTerminalStreamUrl(
  config: RuntimeConfig,
  widgetId: string,
  options: TerminalStreamUrlOptions = {},
): string {
  const path = `/api/v1/terminal/${encodeURIComponent(widgetId)}/stream`;
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const url = new URL(path, `${baseUrl}/`);

  applyFromQueryParam(url, options.from);
  if (shouldUseQueryTokenForStream(config)) {
    applyTokenQueryParam(url, config.authToken, options.includeQueryToken !== false);
  }
  return url.toString();
}

export function shouldUseQueryTokenForStream(config: RuntimeConfig): boolean {
  return config.streamAuthMode === "query-token" && Boolean(config.authToken);
}

export function resolveStreamMode(config: RuntimeConfig): StreamAuthMode {
  if (shouldUseQueryTokenForStream(config)) {
    return "query-token";
  }
  if (config.streamAuthMode === "authorization-header" && config.authToken) {
    return "authorization-header";
  }
  return "none";
}
