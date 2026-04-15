// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { getAuditFacade, getToolsFacade } from "@/compat";
import { Tooltip } from "@/app/element/tooltip";
import { useT } from "@/app/i18n/i18n";
import { ContextMenuModel } from "@/app/store/contextmenu";
import type { AuditEvent } from "@/rterm-api/audit/types";
import type { PendingApproval, ToolExecutionRequest, ToolExecutionResponse, ToolInfo } from "@/rterm-api/tools/types";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { atoms, createBlock, isDev } from "@/store/global";
import { fireAndForget, isBlank, makeIconClass } from "@/util/util";
import {
    FloatingPortal,
    autoUpdate,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
    buildToolExecutionContext,
    calculateGridSize,
    formatAuditTimestamp,
    formatJson,
    getApprovalToken,
    handleWidgetSelect,
    normalizeAppList,
    sortByDisplayOrder,
} from "./widget-helpers";
import type {
    AuditFloatingWindowProps,
    FloatingWindowProps,
    PendingToolApproval,
    ToolsFloatingWindowProps,
    WidgetDisplayMode,
    WidgetItemProps,
} from "./widget-types";
const Widget = memo(({ widget, mode }: WidgetItemProps) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const labelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mode === "normal" && labelRef.current) {
            const element = labelRef.current;
            setIsTruncated(element.scrollWidth > element.clientWidth);
        }
    }, [mode, widget.label]);

    const shouldDisableTooltip = mode !== "normal" ? false : !isTruncated;

    return (
        <Tooltip
            content={widget.description || widget.label}
            placement="left"
            disable={shouldDisableTooltip}
            divClassName={clsx(
                "flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer",
                mode === "supercompact" ? "text-sm" : "text-lg",
                widget["display:hidden"] && "hidden"
            )}
            divOnClick={() => handleWidgetSelect(widget)}
        >
            <div style={{ color: widget.color }}>
                <i className={makeIconClass(widget.icon, true, { defaultIcon: "browser" })}></i>
            </div>
            {mode === "normal" && !isBlank(widget.label) ? (
                <div
                    ref={labelRef}
                    className="text-xxs mt-0.5 w-full px-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                >
                    {widget.label}
                </div>
            ) : null}
        </Tooltip>
    );
});

const AppsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
        const [apps, setApps] = useState<AppInfo[]>([]);
        const [loading, setLoading] = useState(true);

        const { refs, floatingStyles, context } = useFloating({
            open: isOpen,
            onOpenChange: onClose,
            placement: "left-start",
            middleware: [offset(-2), shift({ padding: 12 })],
            whileElementsMounted: autoUpdate,
            elements: {
                reference: referenceElement,
            },
        });

        const dismiss = useDismiss(context);
        const { getFloatingProps } = useInteractions([dismiss]);

        useEffect(() => {
            if (!isOpen) return;

            const fetchApps = async () => {
                setLoading(true);
                try {
                    const allApps = normalizeAppList(await RpcApi.ListAllAppsCommand(TabRpcClient));
                    const localApps = allApps
                        .filter((app) => !app.appid.startsWith("draft/"))
                        .sort((a, b) => {
                            const aName = a.appid.replace(/^local\//, "");
                            const bName = b.appid.replace(/^local\//, "");
                            return aName.localeCompare(bName);
                        });
                    setApps(localApps);
                } catch (error) {
                    console.error("Failed to fetch apps:", error);
                    setApps([]);
                } finally {
                    setLoading(false);
                }
            };

            fetchApps();
        }, [isOpen]);

        if (!isOpen) return null;

        const gridSize = calculateGridSize(apps.length);

        return (
            <FloatingPortal>
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="bg-modalbg border border-border rounded-lg shadow-xl p-4 z-50"
                >
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                        </div>
                    ) : apps.length === 0 ? (
                        <div className="text-muted text-sm p-4 text-center">No local apps found</div>
                    ) : (
                        <div
                            className="grid gap-3"
                            style={{
                                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                                maxWidth: `${gridSize * 80}px`,
                            }}
                        >
                            {apps.map((app) => {
                                const appMeta = app.manifest?.appmeta;
                                const displayName = app.appid.replace(/^local\//, "");
                                const icon = appMeta?.icon || "cube";
                                const iconColor = appMeta?.iconcolor || "white";

                                return (
                                    <div
                                        key={app.appid}
                                        className="flex flex-col items-center justify-center p-2 rounded hover:bg-hoverbg cursor-pointer transition-colors"
                                        onClick={() => {
                                            const blockDef: BlockDef = {
                                                meta: {
                                                    view: "tsunami",
                                                    controller: "tsunami",
                                                    "tsunami:appid": app.appid,
                                                },
                                            };
                                            createBlock(blockDef);
                                            onClose();
                                        }}
                                    >
                                        <div style={{ color: iconColor }} className="text-3xl mb-1">
                                            <i className={makeIconClass(icon, false)}></i>
                                        </div>
                                        <div className="text-xxs text-center text-secondary break-words w-full px-1">
                                            {displayName}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </FloatingPortal>
        );
    }
);

const SettingsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
        const t = useT();
        const { refs, floatingStyles, context } = useFloating({
            open: isOpen,
            onOpenChange: onClose,
            placement: "left-start",
            middleware: [offset(-2), shift({ padding: 12 })],
            whileElementsMounted: autoUpdate,
            elements: {
                reference: referenceElement,
            },
        });

        const dismiss = useDismiss(context);
        const { getFloatingProps } = useInteractions([dismiss]);

        if (!isOpen) return null;

        const menuItems = [
            {
                icon: "gear",
                label: t("workspace.menu.settings"),
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "waveconfig",
                        },
                    };
                    createBlock(blockDef, false, true);
                    onClose();
                },
            },
            {
                icon: "lightbulb",
                label: t("workspace.menu.tips"),
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "tips",
                        },
                    };
                    createBlock(blockDef, true, true);
                    onClose();
                },
            },
            {
                icon: "lock",
                label: t("workspace.menu.secrets"),
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "waveconfig",
                            file: "secrets",
                        },
                    };
                    createBlock(blockDef, false, true);
                    onClose();
                },
            },
            {
                icon: "circle-question",
                label: t("workspace.menu.help"),
                onClick: () => {
                    const blockDef: BlockDef = {
                        meta: {
                            view: "help",
                        },
                    };
                    createBlock(blockDef);
                    onClose();
                },
            },
        ];

        return (
            <FloatingPortal>
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="bg-modalbg border border-border rounded-lg shadow-xl p-2 z-50"
                >
                    {menuItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 px-3 py-2 rounded hover:bg-hoverbg cursor-pointer transition-colors text-secondary hover:text-white"
                            onClick={item.onClick}
                        >
                            <div className="text-lg w-5 flex justify-center">
                                <i className={makeIconClass(item.icon, false)}></i>
                            </div>
                            <div className="text-sm whitespace-nowrap">{item.label}</div>
                        </div>
                    ))}
                </div>
            </FloatingPortal>
        );
    }
);

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";

const ToolsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement, onAuditChanged }: ToolsFloatingWindowProps) => {
        const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(null);
        const [tools, setTools] = useState<ToolInfo[]>([]);
        const [selectedToolName, setSelectedToolName] = useState("");
        const [repoRoot, setRepoRoot] = useState("");
        const [inputValue, setInputValue] = useState("{}");
        const [responseValue, setResponseValue] = useState<ToolExecutionResponse | null>(null);
        const [executeError, setExecuteError] = useState<string | null>(null);
        const [loading, setLoading] = useState(true);
        const [loadError, setLoadError] = useState<string | null>(null);
        const [isExecuting, setIsExecuting] = useState(false);
        const [isConfirming, setIsConfirming] = useState(false);

        const { refs, floatingStyles, context } = useFloating({
            open: isOpen,
            onOpenChange: onClose,
            placement: "left-start",
            middleware: [offset(-2), shift({ padding: 12 })],
            whileElementsMounted: autoUpdate,
            elements: {
                reference: referenceElement,
            },
        });

        const dismiss = useDismiss(context);
        const { getFloatingProps } = useInteractions([dismiss]);

        useEffect(() => {
            if (!isOpen) return;

            let cancelled = false;
            setLoading(true);
            setLoadError(null);

            void (async () => {
                try {
                    const facade = await getToolsFacade();
                    const [response, bootstrap] = await Promise.all([facade.listTools(), facade.getBootstrap()]);
                    if (cancelled) {
                        return;
                    }
                    const nextTools = response.tools ?? [];
                    setRepoRoot(bootstrap.repo_root ?? "");
                    setTools(nextTools);
                    setSelectedToolName((current) => {
                        if (current && nextTools.some((tool) => tool.name === current)) {
                            return current;
                        }
                        return nextTools[0]?.name ?? "";
                    });
                } catch (error) {
                    if (!cancelled) {
                        setLoadError(error instanceof Error ? error.message : String(error));
                        setTools([]);
                        setSelectedToolName("");
                    }
                } finally {
                    if (!cancelled) {
                        setLoading(false);
                    }
                }
            })();

            return () => {
                cancelled = true;
            };
        }, [isOpen]);

        if (!isOpen) return null;

        const selectedTool = tools.find((tool) => tool.name === selectedToolName) ?? null;

        const handleToolSelect = (toolName: string) => {
            setSelectedToolName(toolName);
            setInputValue("{}");
            setResponseValue(null);
            setExecuteError(null);
            setPendingApproval(null);
        };

        const handleExecute = async () => {
            if (selectedTool == null) {
                return;
            }

            let parsedInput: unknown = {};
            const trimmedInput = inputValue.trim();
            if (trimmedInput !== "") {
                try {
                    parsedInput = JSON.parse(trimmedInput);
                } catch (error) {
                    setExecuteError(error instanceof Error ? error.message : String(error));
                    setResponseValue(null);
                    return;
                }
            }

            setIsExecuting(true);
            setExecuteError(null);

            try {
                const facade = await getToolsFacade();
                const request: ToolExecutionRequest = {
                    tool_name: selectedTool.name,
                    input: parsedInput,
                    context: buildToolExecutionContext(repoRoot),
                };
                const response = await facade.executeTool(request);
                setResponseValue(response);
                onAuditChanged?.();
                if (response.status === "requires_confirmation" && response.pending_approval != null) {
                    setPendingApproval({
                        approval: response.pending_approval,
                        request,
                    });
                } else {
                    setPendingApproval(null);
                }
            } catch (error) {
                setExecuteError(error instanceof Error ? error.message : String(error));
                setResponseValue(null);
                setPendingApproval(null);
            } finally {
                setIsExecuting(false);
            }
        };

        const handleConfirm = async () => {
            if (pendingApproval == null) {
                return;
            }

            setIsConfirming(true);
            setExecuteError(null);

            try {
                const facade = await getToolsFacade();
                const confirmResponse = await facade.confirmApproval(
                    pendingApproval.approval.id,
                    pendingApproval.request.context,
                );
                onAuditChanged?.();
                const approvalToken = getApprovalToken(confirmResponse);
                if (!approvalToken) {
                    setResponseValue(confirmResponse);
                    setExecuteError("Approval token was missing from confirmation response");
                    return;
                }

                const retryResponse = await facade.executeTool({
                    ...pendingApproval.request,
                    approval_token: approvalToken,
                });
                setResponseValue(retryResponse);
                onAuditChanged?.();
                if (retryResponse.status === "requires_confirmation" && retryResponse.pending_approval != null) {
                    setPendingApproval({
                        approval: retryResponse.pending_approval,
                        request: pendingApproval.request,
                    });
                } else {
                    setPendingApproval(null);
                }
            } catch (error) {
                setExecuteError(error instanceof Error ? error.message : String(error));
            } finally {
                setIsConfirming(false);
            }
        };

        return (
            <FloatingPortal>
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[32rem]"
                >
                    <div className="text-sm font-medium text-white mb-3">Tools</div>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                        </div>
                    ) : loadError ? (
                        <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                    ) : tools.length === 0 ? (
                        <div className="text-sm text-muted">No tools available</div>
                    ) : (
                        <div className="flex gap-3 min-h-64">
                            <div className="w-52 shrink-0 border border-border rounded overflow-hidden">
                                <div className="max-h-72 overflow-y-auto">
                                    {tools.map((tool) => {
                                        const selected = tool.name === selectedToolName;
                                        return (
                                            <button
                                                key={tool.name}
                                                type="button"
                                                className={clsx(
                                                    "w-full text-left px-3 py-2 border-b border-border last:border-b-0 transition-colors",
                                                    selected ? "bg-hoverbg text-white" : "text-secondary hover:bg-hoverbg hover:text-white"
                                                )}
                                                onClick={() => handleToolSelect(tool.name)}
                                            >
                                                <div className="text-sm leading-tight">{tool.name}</div>
                                                <div className="text-xs opacity-70 mt-1">
                                                    {tool.metadata.approval_tier} / {tool.metadata.target_kind}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                {selectedTool ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sm text-white">{selectedTool.name}</div>
                                            <div className="text-xs text-secondary mt-1 whitespace-pre-wrap">
                                                {selectedTool.description}
                                            </div>
                                        </div>
                                        <div className="text-xs text-secondary whitespace-pre-wrap break-words">
                                            capabilities: {selectedTool.metadata.capabilities.join(", ") || "none"}
                                        </div>
                                        <div className="text-xs text-secondary whitespace-pre-wrap break-words">
                                            input schema:
                                            <pre className="mt-1 p-2 rounded bg-black/20 overflow-auto text-[11px] text-secondary">
                                                {JSON.stringify(selectedTool.input_schema, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <div className="text-xs text-secondary mb-1">input json:</div>
                                            <textarea
                                                className="w-full min-h-32 rounded border border-border bg-black/20 p-2 text-xs text-white resize-y"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs text-secondary break-all">repo root: {repoRoot || "unknown"}</div>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50"
                                                disabled={isExecuting}
                                                onClick={() => void handleExecute()}
                                            >
                                                {isExecuting ? "Running..." : "Execute"}
                                            </button>
                                        </div>
                                        {pendingApproval ? (
                                            <div className="rounded border border-border p-2 bg-black/20 space-y-2">
                                                <div className="text-xs text-secondary">
                                                    approval required: {pendingApproval.approval.summary}
                                                </div>
                                                <div className="text-xs text-secondary">
                                                    tier: {pendingApproval.approval.approval_tier}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50"
                                                    disabled={isConfirming}
                                                    onClick={() => void handleConfirm()}
                                                >
                                                    {isConfirming ? "Confirming..." : "Confirm and retry"}
                                                </button>
                                            </div>
                                        ) : null}
                                        <div>
                                            <div className="text-xs text-secondary mb-1">response:</div>
                                            <pre className="min-h-28 max-h-64 overflow-auto rounded bg-black/20 p-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
                                                {executeError ?? (responseValue ? formatJson(responseValue) : "No response yet")}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted">Select a tool to inspect its contract</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </FloatingPortal>
        );
    }
);

ToolsFloatingWindow.displayName = "ToolsFloatingWindow";

const AuditFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement, refreshNonce }: AuditFloatingWindowProps) => {
        const [events, setEvents] = useState<AuditEvent[]>([]);
        const [loading, setLoading] = useState(true);
        const [loadError, setLoadError] = useState<string | null>(null);

        const { refs, floatingStyles, context } = useFloating({
            open: isOpen,
            onOpenChange: onClose,
            placement: "left-start",
            middleware: [offset(-2), shift({ padding: 12 })],
            whileElementsMounted: autoUpdate,
            elements: {
                reference: referenceElement,
            },
        });

        const dismiss = useDismiss(context);
        const { getFloatingProps } = useInteractions([dismiss]);

        useEffect(() => {
            if (!isOpen) return;

            let cancelled = false;
            setLoading(true);
            setLoadError(null);

            void (async () => {
                try {
                    const facade = await getAuditFacade();
                    const response = await facade.getEvents(50);
                    if (cancelled) {
                        return;
                    }
                    const nextEvents = Array.isArray(response.events) ? [...response.events].reverse() : [];
                    setEvents(nextEvents);
                } catch (error) {
                    if (!cancelled) {
                        setLoadError(error instanceof Error ? error.message : String(error));
                        setEvents([]);
                    }
                } finally {
                    if (!cancelled) {
                        setLoading(false);
                    }
                }
            })();

            return () => {
                cancelled = true;
            };
        }, [isOpen, refreshNonce]);

        if (!isOpen) return null;

        return (
            <FloatingPortal>
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[30rem]"
                >
                    <div className="text-sm font-medium text-white mb-3">Audit</div>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                        </div>
                    ) : loadError ? (
                        <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                    ) : events.length === 0 ? (
                        <div className="text-sm text-muted">No audit events available</div>
                    ) : (
                        <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
                            {events.map((event) => (
                                <div key={event.id} className="rounded border border-border bg-black/20 p-2 space-y-1.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm text-white break-words">{event.tool_name || "unknown tool"}</div>
                                            <div className="text-[11px] text-secondary">{formatAuditTimestamp(event.timestamp)}</div>
                                        </div>
                                        <div
                                            className={clsx(
                                                "text-[11px] font-medium uppercase tracking-wide shrink-0",
                                                event.success ? "text-emerald-300" : "text-red-300"
                                            )}
                                        >
                                            {event.success ? "success" : "error"}
                                        </div>
                                    </div>
                                    {event.summary ? (
                                        <div className="text-xs text-secondary whitespace-pre-wrap break-words">{event.summary}</div>
                                    ) : null}
                                    <div className="text-[11px] text-secondary space-y-1">
                                        {event.effective_approval_tier ? (
                                            <div>approval tier: {event.effective_approval_tier}</div>
                                        ) : event.approval_tier ? (
                                            <div>approval tier: {event.approval_tier}</div>
                                        ) : null}
                                        {event.approval_used ? <div>approval used: yes</div> : null}
                                        {event.workspace_id ? <div>workspace: {event.workspace_id}</div> : null}
                                        {event.affected_paths && event.affected_paths.length > 0 ? (
                                            <div className="break-words">paths: {event.affected_paths.join(", ")}</div>
                                        ) : null}
                                        {event.affected_widgets && event.affected_widgets.length > 0 ? (
                                            <div className="break-words">widgets: {event.affected_widgets.join(", ")}</div>
                                        ) : null}
                                    </div>
                                    {event.error ? (
                                        <div className="text-xs text-red-300 whitespace-pre-wrap break-words">{event.error}</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </FloatingPortal>
        );
    }
);

AuditFloatingWindow.displayName = "AuditFloatingWindow";

const Widgets = memo(({ compatMode = false }: { compatMode?: boolean }) => {
    const t = useT();
    const fullConfig = useAtomValue(atoms.fullConfigAtom);
    const hasCustomAIPresets = useAtomValue(atoms.hasCustomAIPresetsAtom);
    const [mode, setMode] = useState<WidgetDisplayMode>("normal");
    const containerRef = useRef<HTMLDivElement>(null);
    const measurementRef = useRef<HTMLDivElement>(null);

    const featureWaveAppBuilder = fullConfig?.settings?.["feature:waveappbuilder"] ?? false;
    const showAppsButton = isDev() || featureWaveAppBuilder;
    const widgetsMap = fullConfig?.widgets ?? {};
    const filteredWidgets = hasCustomAIPresets
        ? widgetsMap
        : Object.fromEntries(Object.entries(widgetsMap).filter(([key]) => key !== "defwidget@ai"));
    const widgets = sortByDisplayOrder(filteredWidgets);

    const [isAppsOpen, setIsAppsOpen] = useState(false);
    const appsButtonRef = useRef<HTMLDivElement>(null);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const toolsButtonRef = useRef<HTMLDivElement>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const auditButtonRef = useRef<HTMLDivElement>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLDivElement>(null);
    const [auditRefreshNonce, setAuditRefreshNonce] = useState(0);
    const compatWidgetsStyle = compatMode
        ? ({
              display: "flex",
              flexDirection: "column",
              width: "3rem",
              minWidth: "3rem",
              overflow: "hidden",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              marginLeft: "-0.25rem",
              userSelect: "none",
              flexShrink: 0,
          } as const)
        : undefined;
    const compatMeasurementStyle = compatMode
        ? ({
              display: "flex",
              flexDirection: "column",
              width: "3rem",
              minWidth: "3rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              marginLeft: "-0.25rem",
              userSelect: "none",
              position: "absolute",
              zIndex: -10,
              opacity: 0,
              pointerEvents: "none",
          } as const)
        : undefined;
    const compatActionStyle = compatMode ? ({ minHeight: "32px", flexShrink: 0 } as const) : undefined;

    const checkModeNeeded = useCallback(() => {
        if (!containerRef.current || !measurementRef.current) return;

        const containerHeight = containerRef.current.clientHeight;
        const normalHeight = measurementRef.current.scrollHeight;
        const gracePeriod = 10;

        let newMode: WidgetDisplayMode = "normal";

        if (normalHeight > containerHeight - gracePeriod) {
            newMode = "compact";

            const actionCount = 3 + (showAppsButton ? 1 : 0);
            const totalWidgets = (widgets?.length || 0) + actionCount;
            const minHeightPerWidget = 32;
            const requiredHeight = totalWidgets * minHeightPerWidget;

            if (requiredHeight > containerHeight) {
                newMode = "supercompact";
            }
        }

        // Use functional update to avoid depending on mode
        setMode((prevMode) => (newMode !== prevMode ? newMode : prevMode));
    }, [showAppsButton, widgets]);

    // Use ref to hold the latest checkModeNeeded without re-creating ResizeObserver
    const checkModeNeededRef = useRef(checkModeNeeded);
    checkModeNeededRef.current = checkModeNeeded;

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            checkModeNeededRef.current();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        checkModeNeeded();
    }, [checkModeNeeded]);

    const handleWidgetsBarContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const menu: ContextMenuItem[] = [
            {
                label: t("workspace.menu.editWidgetsJson"),
                click: () => {
                    fireAndForget(async () => {
                        const blockDef: BlockDef = {
                            meta: {
                                view: "waveconfig",
                                file: "widgets.json",
                            },
                        };
                        await createBlock(blockDef, false, true);
                    });
                },
            },
        ];
        ContextMenuModel.showContextMenu(menu, e);
    };

    return (
        <>
            <div
                ref={containerRef}
                className="flex flex-col w-12 overflow-hidden py-1 -ml-1 select-none"
                style={compatWidgetsStyle}
                onContextMenu={handleWidgetsBarContextMenu}
            >
                {mode === "supercompact" ? (
                    <>
                        <div className="grid grid-cols-2 gap-0 w-full">
                            {widgets?.map((data, idx) => (
                                <Widget key={`widget-${idx}`} widget={data} mode={mode} />
                            ))}
                        </div>
                        <div className="flex-grow" />
                        <div className="grid grid-cols-2 gap-0 w-full">
                            <div
                                ref={toolsButtonRef}
                                className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                style={compatActionStyle}
                                onClick={() => setIsToolsOpen(!isToolsOpen)}
                            >
                                <Tooltip content="Tools" placement="left" disable={isToolsOpen}>
                                    <div>
                                        <i className={makeIconClass("screwdriver-wrench", true, { defaultIcon: "toolbox" })}></i>
                                    </div>
                                </Tooltip>
                            </div>
                            <div
                                ref={auditButtonRef}
                                className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                style={compatActionStyle}
                                onClick={() => setIsAuditOpen(!isAuditOpen)}
                            >
                                <Tooltip content="Audit" placement="left" disable={isAuditOpen}>
                                    <div>
                                        <i className={makeIconClass("clipboard-list", true, { defaultIcon: "list-check" })}></i>
                                    </div>
                                </Tooltip>
                            </div>
                            {showAppsButton ? (
                                <div
                                    ref={appsButtonRef}
                                    className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                    style={compatActionStyle}
                                    onClick={() => setIsAppsOpen(!isAppsOpen)}
                                >
                                    <Tooltip content={t("workspace.localWaveApps")} placement="left" disable={isAppsOpen}>
                                        <div>
                                            <i className={makeIconClass("cube", true)}></i>
                                        </div>
                                    </Tooltip>
                                </div>
                            ) : null}
                            <div
                                ref={settingsButtonRef}
                                className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                style={compatActionStyle}
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            >
                                <Tooltip content={t("workspace.settingsAndHelp")} placement="left" disable={isSettingsOpen}>
                                    <div>
                                        <i className={makeIconClass("gear", true)}></i>
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {widgets?.map((data, idx) => (
                            <Widget key={`widget-${idx}`} widget={data} mode={mode} />
                        ))}
                        <div className="flex-grow" />
                        <div
                            ref={toolsButtonRef}
                            className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                            style={compatActionStyle}
                            onClick={() => setIsToolsOpen(!isToolsOpen)}
                        >
                            <Tooltip content="Tools" placement="left" disable={isToolsOpen}>
                                <div className="flex flex-col items-center w-full">
                                    <div>
                                        <i className={makeIconClass("screwdriver-wrench", true, { defaultIcon: "toolbox" })}></i>
                                    </div>
                                    {mode === "normal" && (
                                        <div className="text-xxs mt-0.5 w-full px-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                            Tools
                                        </div>
                                    )}
                                </div>
                            </Tooltip>
                        </div>
                        <div
                            ref={auditButtonRef}
                            className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                            style={compatActionStyle}
                            onClick={() => setIsAuditOpen(!isAuditOpen)}
                        >
                            <Tooltip content="Audit" placement="left" disable={isAuditOpen}>
                                <div className="flex flex-col items-center w-full">
                                    <div>
                                        <i className={makeIconClass("clipboard-list", true, { defaultIcon: "list-check" })}></i>
                                    </div>
                                    {mode === "normal" && (
                                        <div className="text-xxs mt-0.5 w-full px-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                            Audit
                                        </div>
                                    )}
                                </div>
                            </Tooltip>
                        </div>
                        {showAppsButton ? (
                            <div
                                ref={appsButtonRef}
                                className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                                style={compatActionStyle}
                                onClick={() => setIsAppsOpen(!isAppsOpen)}
                            >
                                <Tooltip content={t("workspace.localWaveApps")} placement="left" disable={isAppsOpen}>
                                    <div className="flex flex-col items-center w-full">
                                        <div>
                                            <i className={makeIconClass("cube", true)}></i>
                                        </div>
                                        {mode === "normal" && (
                                            <div className="text-xxs mt-0.5 w-full px-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                                {t("workspace.appsLabel")}
                                            </div>
                                        )}
                                    </div>
                                </Tooltip>
                            </div>
                        ) : null}
                        <div
                            ref={settingsButtonRef}
                            className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                            style={compatActionStyle}
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        >
                            <Tooltip content={t("workspace.settingsAndHelp")} placement="left" disable={isSettingsOpen}>
                                <div>
                                    <i className={makeIconClass("gear", true)}></i>
                                </div>
                            </Tooltip>
                        </div>
                    </>
                )}
                {isDev() ? (
                    <div
                        className="flex justify-center items-center w-full py-1 text-accent text-[30px]"
                        title="Running TideTerm Dev Build"
                    >
                        <i className="fa fa-brands fa-dev fa-fw" />
                    </div>
                ) : null}
            </div>
            {showAppsButton && appsButtonRef.current && (
                <AppsFloatingWindow
                    isOpen={isAppsOpen}
                    onClose={() => setIsAppsOpen(false)}
                    referenceElement={appsButtonRef.current}
                />
            )}
            {toolsButtonRef.current && (
                <ToolsFloatingWindow
                    isOpen={isToolsOpen}
                    onClose={() => setIsToolsOpen(false)}
                    referenceElement={toolsButtonRef.current}
                    onAuditChanged={() => setAuditRefreshNonce((current) => current + 1)}
                />
            )}
            {auditButtonRef.current && (
                <AuditFloatingWindow
                    isOpen={isAuditOpen}
                    onClose={() => setIsAuditOpen(false)}
                    referenceElement={auditButtonRef.current}
                    refreshNonce={auditRefreshNonce}
                />
            )}
            {settingsButtonRef.current && (
                <SettingsFloatingWindow
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    referenceElement={settingsButtonRef.current}
                />
            )}

            <div
                ref={measurementRef}
                className="flex flex-col w-12 py-1 -ml-1 select-none absolute -z-10 opacity-0 pointer-events-none"
                style={compatMeasurementStyle}
            >
                {widgets?.map((data, idx) => (
                    <Widget key={`measurement-widget-${idx}`} widget={data} mode="normal" />
                ))}
                <div className="flex-grow" />
                <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                    <div>
                        <i className={makeIconClass("screwdriver-wrench", true, { defaultIcon: "toolbox" })}></i>
                    </div>
                    <div className="text-xxs mt-0.5 w-full px-0.5 text-center">Tools</div>
                </div>
                <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                    <div>
                        <i className={makeIconClass("clipboard-list", true, { defaultIcon: "list-check" })}></i>
                    </div>
                    <div className="text-xxs mt-0.5 w-full px-0.5 text-center">Audit</div>
                </div>
                <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                    <div>
                        <i className={makeIconClass("gear", true)}></i>
                    </div>
                    <div className="text-xxs mt-0.5 w-full px-0.5 text-center">{t("workspace.settingsLabel")}</div>
                </div>
                {showAppsButton ? (
                    <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                        <div>
                            <i className={makeIconClass("cube", true)}></i>
                        </div>
                        <div className="text-xxs mt-0.5 w-full px-0.5 text-center">{t("workspace.appsLabel")}</div>
                    </div>
                ) : null}
                {isDev() ? (
                    <div
                        className="flex justify-center items-center w-full py-1 text-accent text-[30px]"
                        title="Running TideTerm Dev Build"
                    >
                        <i className="fa fa-brands fa-dev fa-fw" />
                    </div>
                ) : null}
            </div>
        </>
    );
});

export { Widgets };
