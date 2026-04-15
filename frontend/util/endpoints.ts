// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getEnv } from "./getenv";
import { lazy } from "./util";

export const WebServerEndpointVarName = "WAVE_SERVER_WEB_ENDPOINT";
export const WSServerEndpointVarName = "WAVE_SERVER_WS_ENDPOINT";
const ViteApiBaseVarName = "VITE_RTERM_API_BASE";

function normalizeHttpEndpoint(value: string): string {
    return value.startsWith("http://") || value.startsWith("https://") ? value : `http://${value}`;
}

export const getWebServerEndpoint = lazy(() => {
    const endpoint = getEnv(WebServerEndpointVarName) ?? getEnv(ViteApiBaseVarName);
    return normalizeHttpEndpoint(endpoint);
});

export const getWSServerEndpoint = lazy(() => {
    const explicitWsEndpoint = getEnv(WSServerEndpointVarName);
    if (explicitWsEndpoint != null) {
        return explicitWsEndpoint.startsWith("ws://") || explicitWsEndpoint.startsWith("wss://")
            ? explicitWsEndpoint
            : `ws://${explicitWsEndpoint}`;
    }
    const httpEndpoint = normalizeHttpEndpoint(getEnv(ViteApiBaseVarName));
    const endpointUrl = new URL(httpEndpoint);
    endpointUrl.protocol = endpointUrl.protocol === "https:" ? "wss:" : "ws:";
    return endpointUrl.toString().replace(/\/$/, "");
});
