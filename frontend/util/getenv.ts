// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

function getWindow(): Window {
    return globalThis.window;
}

function getProcess(): NodeJS.Process | null {
    return (globalThis as typeof globalThis & { process?: NodeJS.Process | undefined }).process ?? null;
}

function getApi(): ElectronApi {
    return (window as Window & { api?: ElectronApi }).api as ElectronApi;
}

/**
 * Gets an environment variable from the host process, either directly or via IPC if called from the browser.
 * @param paramName The name of the environment variable to attempt to retrieve.
 * @returns The value of the environment variable or null if not present.
 */
export function getEnv(paramName: string): string | undefined {
    const win = getWindow();
    if (win != null) {
        return getApi().getEnv(paramName);
    }
    const proc = getProcess();
    if (proc != null) {
        return proc.env[paramName] ?? undefined;
    }
    return undefined;
}
