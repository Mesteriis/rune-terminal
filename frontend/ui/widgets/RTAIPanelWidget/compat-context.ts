let compatRuntime = false;
let compatActiveTabId = "";

export function setWaveAICompatContext(nextCompatRuntime: boolean, nextActiveTabId: string): void {
    compatRuntime = nextCompatRuntime;
    compatActiveTabId = nextCompatRuntime ? nextActiveTabId : "";
}

export function isWaveAICompatRuntime(): boolean {
    return compatRuntime;
}

export function getWaveAICompatActiveTabId(): string | null {
    return compatActiveTabId || null;
}
