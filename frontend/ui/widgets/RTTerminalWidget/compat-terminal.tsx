import { terminalStore } from "@/app/state/terminal.store";
import { WaveAIModel } from "@/ui/widgets/RTAIPanelWidget/waveai-model";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { CompatPaneHeader } from "@/app/workspace/compat-pane-header";
import { getTerminalFacade } from "@/compat/terminal";
import type { TerminalSnapshot } from "@/rterm-api/terminal/types";
import { CenteredDiv } from "@/ui/primitives/RTQuickElems";
import { globalStore } from "@/store/global";
import { explainLatestTerminalOutputInAI } from "./explain-latest-output";
import { handleCompatTerminalClipboardKeydown } from "./compat-terminal-keydown";
import { parseDraggedFileUri } from "./dragged-file-uri";
import { TermWrap } from "./termwrap";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDrop } from "react-dnd";
import "./term.scss";
import "./xterm.css";

interface CompatTerminalViewProps {
    widgetId: string;
    connectionId?: string;
    title?: string;
    headerActions?: ReactNode;
}

function registerCompatTerminalForDebug(widgetId: string, termWrap: TermWrap | null) {
    if (!import.meta.env.DEV) {
        return;
    }
    const debugWindow = window as typeof window & {
        __RTERM_COMPAT_TERMS?: Record<string, TermWrap>;
    };
    if (termWrap == null) {
        if (debugWindow.__RTERM_COMPAT_TERMS != null) {
            delete debugWindow.__RTERM_COMPAT_TERMS[widgetId];
        }
        return;
    }
    if (debugWindow.__RTERM_COMPAT_TERMS == null) {
        debugWindow.__RTERM_COMPAT_TERMS = {};
    }
    debugWindow.__RTERM_COMPAT_TERMS[widgetId] = termWrap;
}

function isLocalConnection(connectionId?: string): boolean {
    return connectionId == null || connectionId === "" || connectionId === "local" || connectionId.startsWith("local:");
}

export function CompatTerminalView({ widgetId, connectionId, title, headerActions }: CompatTerminalViewProps) {
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
    const [shellIntegrationStatus, setShellIntegrationStatus] = useState<"ready" | "running-command" | null>(null);
    const [lastCommand, setLastCommand] = useState<string | null>(null);
    const isRemoteTerminal = !isLocalConnection(connectionId);
    const terminalConnection = connectionId ?? "local";
    const terminalTitle = title?.trim() || (isRemoteTerminal ? "Remote terminal" : "Terminal");

    const [, dropFileItemToTerm] = useDrop(
        () => ({
            accept: "FILE_ITEM",
            canDrop: (item: DraggedFile) => {
                const parsed = parseDraggedFileUri(item?.uri);
                if (!parsed?.connection) {
                    return false;
                }
                return parsed.connection === terminalConnection;
            },
            drop: (item: DraggedFile, monitor) => {
                if (monitor.didDrop()) {
                    return;
                }
                let pathToPaste = parseDraggedFileUri(item?.uri)?.path ?? "";
                if (pathToPaste.startsWith("/~")) {
                    pathToPaste = pathToPaste.slice(1);
                }
                if (pathToPaste === "") {
                    return;
                }
                termWrapRef.current?.terminal.focus();
                termWrapRef.current?.pasteText(pathToPaste);
            },
        }),
        [terminalConnection],
    );

    const syncShellIntegrationState = useCallback(() => {
        const termWrap = termWrapRef.current;
        if (termWrap == null) {
            setShellIntegrationStatus(null);
            setLastCommand(null);
            return;
        }
        setShellIntegrationStatus(globalStore.get(termWrap.shellIntegrationStatusAtom) ?? null);
        setLastCommand(globalStore.get(termWrap.lastCommandAtom) ?? null);
    }, []);

    const refreshLifecycle = useCallback(async () => {
        try {
            const facade = await getTerminalFacade();
            const snapshot = await facade.getSnapshot(widgetId);
            if (!lifecyclePollingActiveRef.current) {
                return;
            }
            setLifecycleSnapshot(snapshot);
            setLifecycleError(null);
            syncShellIntegrationState();
        } catch (error) {
            if (!lifecyclePollingActiveRef.current) {
                return;
            }
            setLifecycleError(error instanceof Error ? error.message : String(error));
            syncShellIntegrationState();
        }
    }, [syncShellIntegrationState, widgetId]);

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
        registerCompatTerminalForDebug(widgetId, termWrap);
        void termWrap.initTerminal();
        syncShellIntegrationState();

        return () => {
            termWrap.dispose();
            registerCompatTerminalForDebug(widgetId, null);
            termWrapRef.current = null;
        };
    }, [connectionId, syncShellIntegrationState, widgetId]);

    useEffect(() => {
        if (rootRef.current == null) {
            return;
        }
        dropFileItemToTerm(rootRef.current);
    }, [dropFileItemToTerm]);

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
    }, [refreshLifecycle, widgetId]);

    if (!widgetId) {
        return <CenteredDiv>No Terminal Widget</CenteredDiv>;
    }

    const lifecycleStatus = lifecycleSnapshot?.state.status ?? "unknown";
    const restoredSession = lifecycleSnapshot?.state.restored === true;
    const isConnected = lifecycleStatus === "running";
    const lifecycleLabel = isConnected
        ? (restoredSession ? "restored" : "connected")
        : lifecycleStatus === "unknown" ? "status unknown" : "disconnected";
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

    const shellIntegrationLabel =
        shellIntegrationStatus === "ready"
            ? "AI ready"
            : shellIntegrationStatus === "running-command"
                ? "AI blocked"
                : "AI idle";
    const shellIntegrationTitle =
        shellIntegrationStatus === "ready"
            ? "Shell integration is ready for explicit AI execution."
            : shellIntegrationStatus === "running-command"
                ? `Shell integration is blocked while a command is running${lastCommand ? `: ${lastCommand}` : ""}.`
                : "Shell integration metadata is not available yet.";
    const headerMessage =
        restartError
        ?? explainError
        ?? restartStatus
        ?? explainStatus
        ?? (lifecycleStatus !== "running" || restoredSession ? lifecycleDetail : null);

    const paneBadges = [
        {
            label: isRemoteTerminal ? "remote" : "local",
        },
        {
            label: lifecycleLabel,
            tone: isConnected ? (restoredSession ? "info" : "success") : "warning",
            title: lifecycleDetail ?? undefined,
        },
        {
            label: shellIntegrationLabel,
            tone:
                shellIntegrationStatus === "ready"
                    ? "info"
                    : shellIntegrationStatus === "running-command"
                        ? "warning"
                        : "neutral",
            icon: "sparkles",
            title: shellIntegrationTitle,
        },
    ] as const;

    const paneActions = [
        {
            icon: "rotate-right",
            label: isRemoteTerminal ? "Reconnect session" : "Restart session",
            title: restartBusy ? "Restarting session" : isRemoteTerminal ? "Reconnect session" : "Restart session",
            disabled: restartBusy,
            spin: restartBusy,
            onClick: () => {
                void restartSession();
            },
            testID: `compat-terminal-restart-${widgetId}`,
        },
        {
            icon: explainBusy ? "circle-notch" : "circle-question",
            label: "Explain latest output",
            title: explainBusy ? "Sending latest output to AI" : "Explain latest output",
            disabled: explainBusy,
            spin: explainBusy,
            onClick: () => {
                void explainLatestCommandOutput();
            },
            testID: `compat-terminal-explain-${widgetId}`,
        },
    ] as const;

    return (
        <div
            ref={rootRef}
            className="view-term term-mode-term bg-black/10"
            onClick={() => {
                termWrapRef.current?.terminal.focus();
            }}
        >
            <CompatPaneHeader
                icon="terminal"
                title={terminalTitle}
                subtitle={isRemoteTerminal ? terminalConnection : "Local machine"}
                badges={paneBadges}
                actions={paneActions}
                extraActions={headerActions}
                dragTitle="Drag to rearrange terminal block"
                message={
                    headerMessage
                        ? {
                              text: headerMessage,
                              tone:
                                  restartError || explainError || lifecycleStatus === "failed" || lifecycleStatus === "exited"
                                      ? "error"
                                      : restartStatus || explainStatus
                                          ? "success"
                                          : "default",
                          }
                        : null
                }
                testID={`compat-terminal-header-${widgetId}`}
            />
            <div key="connectElem" className="term-connectelem" ref={connectElemRef} />
        </div>
    );
}
