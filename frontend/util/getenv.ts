// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

function getWindow(): Window {
    return globalThis.window;
}

function getProcess(): NodeJS.Process | null {
    return (globalThis as typeof globalThis & { process?: NodeJS.Process | undefined }).process ?? null;
}

function getApi(): ElectronApi | undefined {
    return (window as Window & { api?: ElectronApi }).api;
}

/**
 * Gets an environment variable from the host process, either directly or via IPC if called from the browser.
 * @param paramName The name of the environment variable to attempt to retrieve.
 * @returns The value of the environment variable or null if not present.
 */
export function getEnv(paramName: string): string | undefined {
    const win = getWindow();
    if (win != null) {
        const apiValue = getApi()?.getEnv?.(paramName);
        if (apiValue != null) {
            return apiValue;
        }
        const viteValue = (import.meta.env as Record<string, string | undefined> | undefined)?.[paramName];
        if (viteValue != null) {
            return viteValue;
        }
    }
    const proc = getProcess();
    if (proc != null) {
        return proc.env[paramName] ?? undefined;
    }
    return undefined;
}
