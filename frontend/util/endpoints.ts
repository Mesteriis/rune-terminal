// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getEnv } from "./getenv";
import { lazy } from "./util";

export const WebServerEndpointVarName = "WAVE_SERVER_WEB_ENDPOINT";
export const WSServerEndpointVarName = "WAVE_SERVER_WS_ENDPOINT";
const ViteApiBaseVarName = "VITE_RTERM_API_BASE";

function normalizeHttpEndpoint(value?: string | null): string {
    const candidate = typeof value === "string" ? value.trim() : "";
    if (candidate.length > 0) {
        return candidate.startsWith("http://") || candidate.startsWith("https://") ? candidate : `http://${candidate}`;
    }
    if (typeof globalThis.window === "object" && globalThis.window?.location != null) {
        return globalThis.window.location.origin;
    }
    return "http://127.0.0.1:8080";
}

export const getWebServerEndpoint = lazy(() => {
    const endpoint = getEnv(WebServerEndpointVarName) ?? getEnv(ViteApiBaseVarName);
    return normalizeHttpEndpoint(endpoint);
});

export const getWSServerEndpoint = lazy(() => {
    const explicitWsEndpoint = getEnv(WSServerEndpointVarName);
    if (explicitWsEndpoint != null && String(explicitWsEndpoint).trim().length > 0) {
        return explicitWsEndpoint.startsWith("ws://") || explicitWsEndpoint.startsWith("wss://")
            ? explicitWsEndpoint
            : `ws://${explicitWsEndpoint}`;
    }
    const httpEndpoint = normalizeHttpEndpoint(getEnv(ViteApiBaseVarName));
    const endpointUrl = new URL(httpEndpoint);
    endpointUrl.protocol = endpointUrl.protocol === "https:" ? "wss:" : "ws:";
    return endpointUrl.toString().replace(/\/$/, "");
});
