import { terminalStore } from "@/app/state/terminal.store";
import { WaveAIModel } from "@/app/aipanel/waveai-model";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { getTerminalFacade } from "@/compat/terminal";
import type { TerminalSnapshot } from "@/rterm-api/terminal/types";
import { CenteredDiv } from "@/element/quickelems";
import { explainLatestTerminalOutputInAI } from "./explain-latest-output";
import { handleCompatTerminalClipboardKeydown } from "./compat-terminal-keydown";
import { TermWrap } from "./termwrap";
import { useEffect, useRef, useState } from "react";
import "./term.scss";
import "./xterm.css";

interface CompatTerminalViewProps {
    widgetId: string;
    connectionId?: string;
}

function isLocalConnection(connectionId?: string): boolean {
    return connectionId == null || connectionId === "" || connectionId === "local" || connectionId.startsWith("local:");
}

export function CompatTerminalView({ widgetId, connectionId }: CompatTerminalViewProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const connectElemRef = useRef<HTMLDivElement>(null);
    const termWrapRef = useRef<TermWrap | null>(null);
    const lifecyclePollingActiveRef = useRef(false);
    const [explainBusy, setExplainBusy] = useState(false);
    const [explainStatus, setExplainStatus] = useState<string | null>(null);
    const [explainError, setExplainError] = useState<string | null>(null);
    const [restartBusy, setRestartBusy] = useState(false);
    const [restartStatus, setRestartStatus] = useState<string | null>(null);
    const [restartError, setRestartError] = useState<string | null>(null);
    const [lifecycleSnapshot, setLifecycleSnapshot] = useState<TerminalSnapshot | null>(null);
    const [lifecycleError, setLifecycleError] = useState<string | null>(null);
    const isRemoteTerminal = !isLocalConnection(connectionId);

    const refreshLifecycle = async () => {
        try {
            const facade = await getTerminalFacade();
            const snapshot = await facade.getSnapshot(widgetId);
            if (!lifecyclePollingActiveRef.current) {
                return;
            }
            setLifecycleSnapshot(snapshot);
            setLifecycleError(null);
        } catch (error) {
            if (!lifecyclePollingActiveRef.current) {
                return;
            }
            setLifecycleError(error instanceof Error ? error.message : String(error));
        }
    };

    useEffect(() => {
        if (connectElemRef.current == null) {
            return;
        }

        const termWrap = new TermWrap(
            widgetId,
            widgetId,
            connectElemRef.current,
            {
                fontSize: 12,
                fontFamily: "Hack",
                drawBoldTextInBrightColors: false,
                fontWeight: "normal",
                fontWeightBold: "bold",
                allowTransparency: true,
                scrollback: 2000,
                allowProposedApi: true,
                ignoreBracketedPasteMode: false,
            },
            {
                keydownHandler: (event: KeyboardEvent) => handleCompatTerminalClipboardKeydown(event, termWrapRef.current),
                useWebGl: false,
                sendDataHandler: (data: string) => {
                    void terminalStore.sendInput(widgetId, data).catch((err) => {
                        console.log("error sending terminal input", widgetId, err);
                    });
                },
            }
        );
        (
            termWrap as unknown as {
                isLocalConnection?: () => boolean;
            }
        ).isLocalConnection = () => isLocalConnection(connectionId);
        termWrapRef.current = termWrap;
        void termWrap.initTerminal();

        return () => {
            termWrap.dispose();
            termWrapRef.current = null;
        };
    }, [connectionId, widgetId]);

    useEffect(() => {
        if (!widgetId) {
            return;
        }
        lifecyclePollingActiveRef.current = true;
        void refreshLifecycle();
        const intervalID = window.setInterval(() => {
            void refreshLifecycle();
        }, 4000);
        return () => {
            lifecyclePollingActiveRef.current = false;
            window.clearInterval(intervalID);
        };
    }, [widgetId]);

    if (!widgetId) {
        return <CenteredDiv>No Terminal Widget</CenteredDiv>;
    }

    const lifecycleStatus = lifecycleSnapshot?.state.status ?? "unknown";
    const restoredSession = lifecycleSnapshot?.state.restored === true;
    const isConnected = lifecycleStatus === "running";
    const lifecycleLabel = isConnected
        ? (restoredSession ? "restored" : "connected")
        : lifecycleStatus === "unknown" ? "status unknown" : "disconnected";
    const lifecycleColorClass = isConnected ? (restoredSession ? "text-cyan-300" : "text-emerald-300") : "text-amber-300";
    const lifecycleDetail = lifecycleError
        ?? lifecycleSnapshot?.state.status_detail
        ?? (restoredSession ? "session was recreated from persisted tab metadata after runtime restart" : null)
        ?? (lifecycleSnapshot?.state.status === "failed"
            ? "session failed"
            : lifecycleSnapshot?.state.status === "exited"
                ? `session exited${lifecycleSnapshot.state.exit_code != null ? ` (code ${lifecycleSnapshot.state.exit_code})` : ""}`
                : null);

    const restartSession = async () => {
        if (restartBusy) {
            return;
        }
        setRestartBusy(true);
        setRestartStatus(null);
        setRestartError(null);
        try {
            const facade = await getTerminalFacade();
            await facade.restartSession(widgetId);
            await terminalStore.refresh(widgetId);
            terminalStore.startStream(widgetId, 0);
            await refreshLifecycle();
            setRestartStatus("Session restarted explicitly.");
        } catch (error) {
            setRestartError(error instanceof Error ? error.message : String(error));
        } finally {
            setRestartBusy(false);
        }
    };

    const explainLatestCommandOutput = async () => {
        if (explainBusy) {
            return;
        }
        setExplainBusy(true);
        setExplainStatus(null);
        setExplainError(null);
        try {
            const result = await explainLatestTerminalOutputInAI({
                widgetID: widgetId,
                actionSource: "terminal.widget.explain_latest_output",
            });
            WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
            WaveAIModel.getInstance().focusInput();
            const commandIdentitySuffix = result.commandAuditEventID ? ` (event ${result.commandAuditEventID})` : "";
            setExplainStatus(`Explained latest output for: ${result.command}${commandIdentitySuffix}`);
        } catch (error) {
            setExplainError(error instanceof Error ? error.message : String(error));
        } finally {
            setExplainBusy(false);
        }
    };

    return (
        <div
            ref={rootRef}
            className="view-term term-mode-term"
            onClick={() => {
                termWrapRef.current?.terminal.focus();
            }}
        >
            <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
                <div className={`text-[10px] uppercase tracking-wide ${lifecycleColorClass}`}>
                    {isRemoteTerminal ? "remote" : "local"} session {lifecycleLabel}
                </div>
                {lifecycleDetail ? <div className="text-[10px] text-red-300 max-w-[24rem]">{lifecycleDetail}</div> : null}
            </div>
            <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                <button
                    type="button"
                    className="px-2 py-1 text-[11px] rounded border border-border bg-black/30 text-secondary hover:text-white disabled:opacity-50"
                    disabled={restartBusy}
                    onClick={(event) => {
                        event.stopPropagation();
                        void restartSession();
                    }}
                >
                    {restartBusy ? "Restarting..." : isRemoteTerminal ? "Reconnect Session" : "Restart Session"}
                </button>
                <button
                    type="button"
                    className="px-2 py-1 text-[11px] rounded border border-border bg-black/30 text-secondary hover:text-white disabled:opacity-50"
                    disabled={explainBusy}
                    onClick={(event) => {
                        event.stopPropagation();
                        void explainLatestCommandOutput();
                    }}
                >
                    {explainBusy ? "Sending..." : isRemoteTerminal ? "Explain Remote Command In AI" : "Explain Latest Output In AI"}
                </button>
                {restartStatus ? <div className="text-[10px] text-emerald-300 max-w-[24rem] text-right">{restartStatus}</div> : null}
                {restartError ? <div className="text-[10px] text-red-300 max-w-[24rem] text-right">{restartError}</div> : null}
                {explainStatus ? <div className="text-[10px] text-emerald-300 max-w-[24rem] text-right">{explainStatus}</div> : null}
                {explainError ? <div className="text-[10px] text-red-300 max-w-[24rem] text-right">{explainError}</div> : null}
            </div>
            <div key="connectElem" className="term-connectelem" ref={connectElemRef} />
        </div>
    );
}
