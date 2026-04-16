import { describe, expect, test } from "vitest";
import { detectStreamAuthMode } from "./config";
import { buildRuntimeTerminalStreamUrl, resolveStreamMode, shouldUseQueryTokenForStream } from "./stream";
import type { RuntimeConfig } from "./types";

function runtimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    baseUrl: "http://127.0.0.1:52850",
    authToken: "stream-token",
    isTauri: false,
    isDev: true,
    streamAuthMode: "authorization-header",
    source: "vite-env",
    ...overrides,
  };
}

describe("stream auth mode", () => {
  test("detectStreamAuthMode prefers authorization headers when an auth token exists", () => {
    expect(detectStreamAuthMode("stream-token")).toBe("authorization-header");
    expect(detectStreamAuthMode(undefined)).toBe("none");
  });

  test("normal runtime stream URL does not append the auth token query parameter", () => {
    const url = buildRuntimeTerminalStreamUrl(runtimeConfig(), "term-main", { from: 5 });
    expect(url).toBe("http://127.0.0.1:52850/api/v1/terminal/term-main/stream?from=5");
    expect(shouldUseQueryTokenForStream(runtimeConfig())).toBe(false);
    expect(resolveStreamMode(runtimeConfig())).toBe("authorization-header");
  });

  test("explicit query-token fallback still appends the token when configured", () => {
    const config = runtimeConfig({ streamAuthMode: "query-token" });
    const url = buildRuntimeTerminalStreamUrl(config, "term-main", { from: 7 });
    expect(url).toBe("http://127.0.0.1:52850/api/v1/terminal/term-main/stream?from=7&token=stream-token");
    expect(shouldUseQueryTokenForStream(config)).toBe(true);
    expect(resolveStreamMode(config)).toBe("query-token");
  });
});
