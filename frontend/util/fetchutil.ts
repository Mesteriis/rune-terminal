// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

// Tauri/web runtime is the default path. A legacy Electron net fallback can be enabled
// explicitly in non-browser environments with RTERM_ENABLE_LEGACY_ELECTRON_NET=1.

type FetchLike = (input: string | GlobalRequest | URL, init?: RequestInit) => Promise<Response>;

let legacyElectronFetch: FetchLike | null | undefined;
let legacyElectronFetchLoading: Promise<FetchLike | null> | null = null;

function shouldUseLegacyElectronNet(): boolean {
    if (typeof window !== "undefined") {
        return false;
    }
    if (typeof process === "undefined" || process.env == null) {
        return false;
    }
    return process.env.RTERM_ENABLE_LEGACY_ELECTRON_NET === "1";
}

async function resolveLegacyElectronFetch(): Promise<FetchLike | null> {
    if (!shouldUseLegacyElectronNet()) {
        return null;
    }
    if (legacyElectronFetch !== undefined) {
        return legacyElectronFetch;
    }
    if (legacyElectronFetchLoading == null) {
        legacyElectronFetchLoading = new Function("specifier", "return import(specifier);")("electron")
            .then((mod: { net?: { fetch?: FetchLike } }) => mod.net?.fetch ?? null)
            .then((fetchFn) => {
                legacyElectronFetch = fetchFn;
                return fetchFn;
            })
            .catch(() => {
                legacyElectronFetch = null;
                return null;
            });
    }
    return legacyElectronFetchLoading;
}

export async function fetch(input: string | GlobalRequest | URL, init?: RequestInit): Promise<Response> {
    const fallbackFetch = await resolveLegacyElectronFetch();
    if (fallbackFetch != null) {
        return fallbackFetch(input, init);
    }
    return globalThis.fetch(input, init);
}
