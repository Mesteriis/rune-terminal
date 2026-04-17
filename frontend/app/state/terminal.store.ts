import type { SendInputResponse, TerminalOutputChunk, TerminalSnapshot } from "@/rterm-api/terminal/types";
import type { TerminalStreamError } from "@/rterm-api/http/sse";
import { getTerminalFacade } from "@/compat/terminal";
import { sessionStore } from "@/app/state/session.store";
import { fireAndForget } from "@/util/util";

export type TerminalStoreEventType = "snapshot" | "chunk" | "end" | "error" | "stream-start" | "stream-stop";

export interface TerminalWidgetState {
    widgetId: string;
    snapshot: TerminalSnapshot | null;
    nextSeq: number;
    sessionId: string | null;
    streamActive: boolean;
    streamError: string | null;
}

export interface TerminalStoreState {
    widgets: Record<string, TerminalWidgetState>;
}

export interface TerminalStoreUpdateEvent {
    widgetId: string;
    type: TerminalStoreEventType;
    chunk?: TerminalOutputChunk;
    error?: TerminalStreamError;
}

export type TerminalStoreListener = (snapshot: TerminalStoreState, event: TerminalStoreUpdateEvent) => void;

const defaultState: TerminalStoreState = {
    widgets: {},
};

interface StreamState {
    abortController: AbortController | null;
    fromSeq: number;
}

function normalizeTerminalSnapshot(snapshot: TerminalSnapshot): TerminalSnapshot {
    return {
        ...snapshot,
        chunks: Array.isArray(snapshot?.chunks) ? snapshot.chunks : [],
    };
}

function isIntentionalStreamAbort(error: unknown, signal?: AbortSignal | null): boolean {
    if (signal?.aborted) {
        return true;
    }
    if (typeof error === "string") {
        return error.toLowerCase().includes("aborted");
    }
    if (error != null && typeof error === "object") {
        const name = "name" in error ? String(error.name ?? "") : "";
        const message = "message" in error ? String(error.message ?? "") : "";
        return name === "AbortError" || message.toLowerCase().includes("aborted");
    }
    return false;
}

class TerminalStore {
    private state: TerminalStoreState;
    private listeners = new Set<TerminalStoreListener>();
    private refreshPromises = new Map<string, Promise<void>>();
    private streamStates = new Map<string, StreamState>();

    constructor() {
        this.state = {
            widgets: {},
        };
    }

    getSnapshot(): TerminalStoreState {
        const widgets: TerminalStoreState["widgets"] = {};
        for (const [widgetId, widgetState] of Object.entries(this.state.widgets)) {
            widgets[widgetId] = { ...widgetState };
        }
        return { widgets };
    }

    getWidgetSnapshot(widgetId: string): TerminalWidgetState | null {
        const widgetState = this.state.widgets[widgetId];
        return widgetState ? { ...widgetState } : null;
    }

    subscribe(listener: TerminalStoreListener): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot(), {
            widgetId: "",
            type: "snapshot",
        });
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(widgetId: string, type: TerminalStoreEventType, eventData?: { chunk?: TerminalOutputChunk; error?: TerminalStreamError }) {
        const snapshot = this.getSnapshot();
        for (const listener of [...this.listeners]) {
            listener(snapshot, {
                widgetId,
                type,
                chunk: eventData?.chunk,
                error: eventData?.error,
            });
        }
    }

    private getOrCreateWidgetState(widgetId: string): TerminalWidgetState {
        if (this.state.widgets[widgetId] == null) {
            this.state.widgets[widgetId] = {
                widgetId,
                snapshot: null,
                nextSeq: 0,
                sessionId: null,
                streamActive: false,
                streamError: null,
            };
        }
        return this.state.widgets[widgetId];
    }

    private setWidgetState(widgetId: string, nextState: Partial<TerminalWidgetState>): void {
        const current = this.getOrCreateWidgetState(widgetId);
        this.state.widgets[widgetId] = {
            ...current,
            ...nextState,
        };
        this.notify(widgetId, "snapshot");
    }

    async refresh(widgetId: string): Promise<TerminalSnapshot | null> {
        const inFlight = this.refreshPromises.get(widgetId);
        if (inFlight) {
            await inFlight;
            return this.state.widgets[widgetId]?.snapshot ?? null;
        }

        const refreshTask = (async () => {
            const facade = await getTerminalFacade();
            const snapshot = normalizeTerminalSnapshot(await facade.getSnapshot(widgetId));
            const widgetState = this.getOrCreateWidgetState(widgetId);
            const prevSessionId = widgetState.sessionId;

            widgetState.snapshot = snapshot;
            widgetState.nextSeq = snapshot.next_seq;
            widgetState.sessionId = snapshot.state?.session_id ?? null;
            widgetState.streamError = null;
            this.state.widgets[widgetId] = widgetState;

            if (widgetState.sessionId != prevSessionId) {
                sessionStore.setActiveSession(widgetId, widgetState.sessionId);
            }

            this.notify(widgetId, "snapshot");
        })().finally(() => {
            this.refreshPromises.delete(widgetId);
        });

        this.refreshPromises.set(widgetId, refreshTask);
        await refreshTask;
        return this.state.widgets[widgetId]?.snapshot ?? null;
    }

    async sendInput(widgetId: string, text: string): Promise<SendInputResponse> {
        const facade = await getTerminalFacade();
        return facade.sendInput(widgetId, { text });
    }

    updateWorkingDir(widgetId: string, workingDir: string): void {
        const state = this.getOrCreateWidgetState(widgetId);
        if (state.snapshot == null || state.snapshot.state == null) {
            return;
        }
        if ((state.snapshot.state.working_dir ?? "") === workingDir) {
            return;
        }
        state.snapshot = {
            ...state.snapshot,
            state: {
                ...state.snapshot.state,
                working_dir: workingDir,
            },
        };
        this.state.widgets[widgetId] = state;
        this.notify(widgetId, "snapshot");
    }

    private stopStream(widgetId: string): void {
        const streamState = this.streamStates.get(widgetId);
        if (!streamState) {
            return;
        }
        if (streamState.abortController != null) {
            streamState.abortController.abort();
        }
        this.streamStates.delete(widgetId);
        this.setWidgetState(widgetId, { streamActive: false });
        this.notify(widgetId, "stream-stop");
    }

    startStream(widgetId: string, fromSeq?: number): void {
        this.stopStream(widgetId);

        const facadeState = this.getOrCreateWidgetState(widgetId);
        const streamState: StreamState = {
            abortController: new AbortController(),
            fromSeq: fromSeq ?? facadeState.nextSeq,
        };
        this.streamStates.set(widgetId, streamState);
        this.setWidgetState(widgetId, {
            streamActive: true,
            streamError: null,
        });

        fireAndForget(() =>
            (async () => {
                const facade = await getTerminalFacade();
                try {
                    await facade.consumeStream(
                        widgetId,
                        {
                            onOutput: (chunk) => {
                                const state = this.getOrCreateWidgetState(widgetId);
                                if (chunk.seq < state.nextSeq) {
                                    return;
                                }
                                if (state.snapshot == null) {
                                    return;
                                }
                                state.nextSeq = chunk.seq + 1;
                                state.snapshot = {
                                    ...state.snapshot,
                                    next_seq: chunk.seq + 1,
                                    chunks: [...state.snapshot.chunks, chunk],
                                };
                                this.state.widgets[widgetId] = state;
                                this.notify(widgetId, "chunk", { chunk });
                            },
                            onKeepAlive: () => {},
                            onEnd: () => {
                                this.setWidgetState(widgetId, { streamActive: false, streamError: null });
                                this.notify(widgetId, "end");
                            },
                            onError: (error) => {
                                this.setWidgetState(widgetId, { streamActive: false, streamError: error.message ?? "stream error" });
                                this.notify(widgetId, "error", { error });
                            },
                            onUnknownEvent: (eventName, data) => {
                                if (eventName === "stream_error") {
                                    this.setWidgetState(widgetId, {
                                        streamActive: false,
                                        streamError: `stream_error:${data}`,
                                    });
                                    this.notify(widgetId, "error", {
                                        error: {
                                            code: "stream_error",
                                            message: data,
                                        },
                                    });
                                    return;
                                }
                                console.warn("unknown terminal stream event", widgetId, eventName, data);
                            },
                        },
                        {
                            from: streamState.fromSeq,
                            signal: streamState.abortController.signal,
                        }
                    );
                } catch (err) {
                    if (isIntentionalStreamAbort(err, streamState.abortController.signal)) {
                        return;
                    }
                    const error = err instanceof Error ? { message: err.message, code: "stream" } : { message: String(err), code: "stream" };
                    if (this.streamStates.get(widgetId) === streamState) {
                        this.setWidgetState(widgetId, { streamActive: false, streamError: error.message });
                        this.notify(widgetId, "error", { error });
                    }
                } finally {
                    const current = this.streamStates.get(widgetId);
                    if (current === streamState) {
                        this.streamStates.delete(widgetId);
                        this.setWidgetState(widgetId, { streamActive: false });
                    }
                }
            })()
        );
    }

    stop(widgetId: string): void {
        this.stopStream(widgetId);
    }
}

export const terminalStore = new TerminalStore();
