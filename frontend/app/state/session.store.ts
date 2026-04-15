export interface SessionStoreSnapshot {
    activeSessions: Record<string, string>;
}

export type SessionStoreListener = (snapshot: SessionStoreSnapshot) => void;

const defaultState: SessionStoreSnapshot = { activeSessions: {} };

class SessionStore {
    private state: SessionStoreSnapshot;
    private listeners: Set<SessionStoreListener> = new Set();

    constructor() {
        this.state = {
            activeSessions: { ...defaultState.activeSessions },
        };
    }

    getSnapshot(): SessionStoreSnapshot {
        return {
            activeSessions: { ...this.state.activeSessions },
        };
    }

    subscribe(listener: SessionStoreListener): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => {
            this.listeners.delete(listener);
        };
    }

    async refresh(): Promise<void> {
        // sessions are derived from terminal snapshots rather than a dedicated endpoint.
        return;
    }

    setActiveSession(widgetId: string, sessionId: string | null): void {
        this.state = {
            activeSessions: {
                ...this.state.activeSessions,
                [widgetId]: sessionId,
            },
        };
        for (const listener of [...this.listeners]) {
            listener(this.getSnapshot());
        }
    }

    getActiveSession(widgetId: string): string | null {
        return this.state.activeSessions[widgetId] ?? null;
    }
}

export const sessionStore = new SessionStore();
