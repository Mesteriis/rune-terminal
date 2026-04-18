// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { WaveAIModel } from "@/ui/widgets/RTAIPanelWidget/waveai-model";
import { useT } from "@/app/i18n/i18n";
import { workspaceStore } from "@/app/state/workspace.store";
import { modalsModel } from "@/app/store/modalmodel";
import type { WorkspaceStoreLayout } from "@/app/state/workspace.store";
import { ContextMenuModel } from "@/app/store/contextmenu";
import type { QuickAction } from "@/rterm-api/quickactions/types";
import { atoms, createBlock, isDev } from "@/store/global";
import { globalStore } from "@/app/store/jotaiStore";
import { getConnectionsFacade } from "@/compat/connections";
import { fireAndForget } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppsFloatingWindow } from "./apps-floating-window";
import { AuditFloatingWindow } from "./audit-floating-window";
import { FilesFloatingWindow } from "./files-floating-window";
import { useActiveWorkspaceContext } from "./active-context";
import {
    type LauncherEntry,
    QuickActionsFloatingWindow,
    type QuickActionRunContext,
    type QuickActionRunResult,
} from "./quick-actions-floating-window";
import { SettingsFloatingWindow } from "./settings-floating-window";
import { ToolsFloatingWindow } from "./tools-floating-window";
import { WidgetActionButton } from "./widget-action-button";
import { sortByDisplayOrder } from "./widget-helpers";
import { WidgetItem } from "./widget-item";
import { WidgetsMeasurement } from "./widgets-measurement";
import type { WidgetDisplayMode } from "./widget-types";
import { WorkspaceLayoutModel } from "./workspace-layout-model";
import { explainLatestTerminalOutputInAI } from "@/ui/widgets/RTTerminalWidget/explain-latest-output";

function quotePathForShell(path: string): string {
    return `'${path.replaceAll("'", `'\\''`)}'`;
}

function buildRunPromptFromSelection(currentInput: string, filePath: string): string {
    const trimmedInput = currentInput.trim();
    const quotedPath = quotePathForShell(filePath);
    if (trimmedInput.startsWith("/run ") || trimmedInput.startsWith("run:")) {
        return `${trimmedInput} ${quotedPath}`;
    }
    return `/run cat ${quotedPath}`;
}

function hasSurface(layout: WorkspaceStoreLayout, surfaceID: string): boolean {
    return layout.surfaces.some((surface) => surface.id === surfaceID);
}

type UtilityFlyout = "apps" | "tools" | "audit" | "files" | "launcher" | "settings";

const Widgets = memo(({ compatMode = false, layout }: { compatMode?: boolean; layout: WorkspaceStoreLayout }) => {
    const t = useT();
    const fullConfig = useAtomValue(atoms.fullConfigAtom);
    const hasCustomAIPresets = useAtomValue(atoms.hasCustomAIPresetsAtom);
    const activeContext = useActiveWorkspaceContext();
    const [workspaceSnapshot, setWorkspaceSnapshot] = useState(() => workspaceStore.getSnapshot().active);
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
    const [isFilesOpen, setIsFilesOpen] = useState(false);
    const filesButtonRef = useRef<HTMLDivElement>(null);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    const quickActionsButtonRef = useRef<HTMLDivElement>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLDivElement>(null);
    const [auditRefreshNonce, setAuditRefreshNonce] = useState(0);
    const toolsEnabled = hasSurface(layout, "tools");
    const auditEnabled = hasSurface(layout, "audit");
    const mcpEnabled = hasSurface(layout, "mcp");
    const compatWidgetsStyle = compatMode
        ? ({
              display: "flex",
              flexDirection: "column",
              width: "2.75rem",
              minWidth: "2.75rem",
              overflow: "hidden",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              marginLeft: "-0.125rem",
              userSelect: "none",
              flexShrink: 0,
          } as const)
        : undefined;
    const compatMeasurementStyle = compatMode
        ? ({
              display: "flex",
              flexDirection: "column",
              width: "2.75rem",
              minWidth: "2.75rem",
              paddingTop: "0.125rem",
              paddingBottom: "0.125rem",
              marginLeft: "-0.125rem",
              userSelect: "none",
              position: "absolute",
              zIndex: -10,
              opacity: 0,
              pointerEvents: "none",
          } as const)
        : undefined;
    const compatActionStyle = compatMode ? ({ minHeight: "28px", flexShrink: 0 } as const) : undefined;

    const setOpenUtilityFlyout = useCallback((target: UtilityFlyout | null) => {
        setIsAppsOpen(target === "apps");
        setIsToolsOpen(target === "tools");
        setIsAuditOpen(target === "audit");
        setIsFilesOpen(target === "files");
        setIsQuickActionsOpen(target === "launcher");
        setIsSettingsOpen(target === "settings");
    }, []);

    const toggleUtilityFlyout = useCallback(
        (target: UtilityFlyout) => {
            const nextTarget =
                (target === "apps" && isAppsOpen) ||
                (target === "tools" && isToolsOpen) ||
                (target === "audit" && isAuditOpen) ||
                (target === "files" && isFilesOpen) ||
                (target === "launcher" && isQuickActionsOpen) ||
                (target === "settings" && isSettingsOpen)
                    ? null
                    : target;
            setOpenUtilityFlyout(nextTarget);
        },
        [isAppsOpen, isAuditOpen, isFilesOpen, isQuickActionsOpen, isSettingsOpen, isToolsOpen, setOpenUtilityFlyout],
    );

    useEffect(() => {
        const unsubscribe = workspaceStore.subscribe((snapshot) => {
            setWorkspaceSnapshot(snapshot.active);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const checkModeNeeded = useCallback(() => {
        if (!containerRef.current || !measurementRef.current) return;

        const containerHeight = containerRef.current.clientHeight;
        const normalHeight = measurementRef.current.scrollHeight;
        const gracePeriod = 10;

        let newMode: WidgetDisplayMode = "normal";

        if (normalHeight > containerHeight - gracePeriod) {
            newMode = "compact";

            const actionCount = (toolsEnabled ? 1 : 0) + (auditEnabled ? 1 : 0) + 3 + (showAppsButton ? 1 : 0);
            const totalWidgets = (widgets?.length || 0) + actionCount;
            const minHeightPerWidget = 28;
            const requiredHeight = totalWidgets * minHeightPerWidget;

            if (requiredHeight > containerHeight) {
                newMode = "supercompact";
            }
        }

        setMode((prevMode) => (newMode !== prevMode ? newMode : prevMode));
    }, [auditEnabled, showAppsButton, toolsEnabled, widgets]);

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

    useEffect(() => {
        if (!toolsEnabled) {
            setIsToolsOpen(false);
        }
    }, [toolsEnabled]);

    useEffect(() => {
        if (!auditEnabled) {
            setIsAuditOpen(false);
        }
    }, [auditEnabled]);

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

    const runQuickAction = useCallback(
        async (action: QuickAction, context: QuickActionRunContext): Promise<QuickActionRunResult> => {
            switch (action.id) {
                case "ui.open_ai_panel":
                    WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "AI panel opened." };
                case "ui.open_tools_panel":
                    if (!toolsEnabled) {
                        return { kind: "error", message: "Tools surface is hidden by current layout." };
                    }
                    setOpenUtilityFlyout("tools");
                    return { kind: "success", message: "Tools panel opened." };
                case "ui.open_audit_panel":
                    if (!auditEnabled) {
                        return { kind: "error", message: "Audit surface is hidden by current layout." };
                    }
                    setOpenUtilityFlyout("audit");
                    return { kind: "success", message: "Audit panel opened." };
                case "ui.open_files_panel":
                    setOpenUtilityFlyout("files");
                    return { kind: "success", message: "Files panel opened." };
                case "mcp.open_controls":
                    if (!toolsEnabled || !mcpEnabled) {
                        return { kind: "error", message: "MCP controls are hidden by current layout surfaces." };
                    }
                    setOpenUtilityFlyout("tools");
                    return { kind: "success", message: "Opened Tools with MCP controls." };
                case "remote.open_profiles":
                    setOpenUtilityFlyout(null);
                    modalsModel.pushModal("RemoteProfilesModal");
                    return { kind: "success", message: "Remote profiles modal opened." };
                case "workspace.create_local_terminal_tab":
                    await workspaceStore.createTerminalTab("local");
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "Created local terminal tab." };
                case "workspace.layout.split":
                    await workspaceStore.updateLayout({ ...layout, mode: "split" });
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "Switched layout mode to split." };
                case "workspace.layout.focus":
                    await workspaceStore.updateLayout({ ...layout, mode: "focus" });
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "Switched layout mode to focus." };
                case "workspace.layout.save":
                    await workspaceStore.saveLayout();
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "Saved current workspace layout." };
                case "remote.start_profile_session": {
                    const profileID = context.selectedRemoteProfileID?.trim() ?? "";
                    if (profileID === "") {
                        return { kind: "error", message: "Select a remote profile first." };
                    }
                    const facade = await getConnectionsFacade();
                    const response = await facade.createSessionFromRemoteProfile(profileID, {
                        title: "Remote Shell",
                    });
                    if (response.workspace) {
                        workspaceStore.hydrate(response.workspace);
                    } else {
                        await workspaceStore.refresh();
                    }
                    setOpenUtilityFlyout(null);
                    return {
                        kind: "success",
                        message: response.reused
                            ? `Reused remote session for profile ${profileID}.`
                            : `Opened new remote session for profile ${profileID}.`,
                    };
                }
                case "terminal.explain_latest_output_in_ai": {
                    if (activeContext.activeWidgetID === "" || activeContext.activeWidgetKind !== "terminal") {
                        return { kind: "error", message: "No active terminal widget available for explain." };
                    }
                    const result = await explainLatestTerminalOutputInAI({
                        widgetID: activeContext.activeWidgetID,
                        actionSource: "quick_actions.terminal.explain_latest_output",
                    });
                    WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
                    WaveAIModel.getInstance().focusInput();
                    setOpenUtilityFlyout(null);
                    const suffix = result.commandAuditEventID ? ` (event ${result.commandAuditEventID})` : "";
                    return { kind: "success", message: `Explained latest output for: ${result.command}${suffix}` };
                }
                case "files.use_selected_path_in_ai_prompt": {
                    const selectedPath = activeContext.activeFilePath.trim();
                    if (selectedPath === "") {
                        return { kind: "error", message: "Select a file path in Files panel first." };
                    }
                    const model = WaveAIModel.getInstance();
                    const currentInput = globalStore.get(model.inputAtom)?.trim() ?? "";
                    globalStore.set(model.inputAtom, currentInput === "" ? selectedPath : `${currentInput} ${selectedPath}`);
                    WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
                    model.focusInput();
                    setOpenUtilityFlyout(null);
                    return { kind: "success", message: "Inserted selected file path into AI prompt input." };
                }
                case "files.use_selected_path_in_run_prompt": {
                    const selectedPath = activeContext.activeFilePath.trim();
                    if (selectedPath === "") {
                        return { kind: "error", message: "Select a file path in Files panel first." };
                    }
                    const model = WaveAIModel.getInstance();
                    const currentInput = globalStore.get(model.inputAtom) ?? "";
                    const nextInput = buildRunPromptFromSelection(currentInput, selectedPath);
                    globalStore.set(model.inputAtom, nextInput);
                    WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
                    model.focusInput();
                    setOpenUtilityFlyout(null);
                    return {
                        kind: "success",
                        message: "Prepared local /run prompt with selected file path. Nothing was executed automatically.",
                    };
                }
                case "files.use_selected_path_in_remote_run_prompt": {
                    const selectedPath = activeContext.activeFilePath.trim();
                    if (selectedPath === "") {
                        return { kind: "error", message: "Select a file path in Files panel first." };
                    }
                    if (activeContext.activeRemoteTarget == null) {
                        return { kind: "error", message: "Active terminal target is local; switch to a remote terminal tab first." };
                    }
                    const model = WaveAIModel.getInstance();
                    const currentInput = globalStore.get(model.inputAtom) ?? "";
                    const nextInput = buildRunPromptFromSelection(currentInput, selectedPath);
                    globalStore.set(model.inputAtom, nextInput);
                    WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
                    model.focusInput();
                    setOpenUtilityFlyout(null);
                    return {
                        kind: "success",
                        message: `Prepared remote /run prompt for ${activeContext.activeRemoteTarget.connectionID}. Nothing was executed automatically.`,
                    };
                }
                default:
                    return {
                        kind: "error",
                        message: `Action is not wired in this minimal quick-actions slice: ${action.label}`,
                    };
            }
        },
        [activeContext, auditEnabled, layout, mcpEnabled, setOpenUtilityFlyout, toolsEnabled],
    );

    const launcherEntries = useMemo<LauncherEntry[]>(() => {
        const entries: LauncherEntry[] = [
            {
                id: "launcher.open_settings_help",
                label: "Open Settings & Help",
                category: "launcher",
                target_kind: "ui",
                invocation_path: "frontend.workspace.widgets.open_settings",
                execution_kind: "ui_only",
            },
        ];
        if (showAppsButton) {
            entries.push({
                id: "launcher.open_apps",
                label: "Open Apps",
                category: "launcher",
                target_kind: "ui",
                invocation_path: "frontend.workspace.widgets.open_apps",
                execution_kind: "ui_only",
            });
        }
        const knownWidgets = Object.values(workspaceSnapshot.widgets)
            .slice()
            .sort((left, right) => {
                const leftLabel = (left.title || left.kind || left.id).toLowerCase();
                const rightLabel = (right.title || right.kind || right.id).toLowerCase();
                return leftLabel.localeCompare(rightLabel);
            });
        for (const widget of knownWidgets) {
            const widgetLabel = widget.title?.trim() || `${widget.kind} ${widget.id}`;
            entries.push({
                id: `launcher.focus_widget.${widget.id}`,
                label: `Focus ${widgetLabel}`,
                category: "widgets",
                target_kind: "workspace",
                invocation_path: "POST /api/v1/workspace/focus-widget",
                execution_kind: "execution_bearing",
            });
        }
        return entries;
    }, [showAppsButton, workspaceSnapshot.widgets]);

    const runLauncherEntry = useCallback(
        async (entry: LauncherEntry): Promise<QuickActionRunResult> => {
            switch (entry.id) {
                case "launcher.open_settings_help":
                    setOpenUtilityFlyout("settings");
                    return { kind: "success", message: "Opened Settings & Help." };
                case "launcher.open_apps":
                    setOpenUtilityFlyout("apps");
                    return { kind: "success", message: "Opened Apps." };
                default:
                    if (entry.id.startsWith("launcher.focus_widget.")) {
                        const widgetID = entry.id.slice("launcher.focus_widget.".length);
                        await workspaceStore.focusWidget(widgetID);
                        setOpenUtilityFlyout(null);
                        return { kind: "success", message: `Focused widget ${widgetID}.` };
                    }
                    return { kind: "error", message: `Launcher entry is not wired: ${entry.label}` };
            }
        },
        [setOpenUtilityFlyout],
    );

    return (
        <>
            <div
                ref={containerRef}
                className="flex flex-col w-11 overflow-hidden py-0.5 -ml-0.5 select-none"
                style={compatWidgetsStyle}
                onContextMenu={handleWidgetsBarContextMenu}
            >
                {mode === "supercompact" ? (
                    <>
                        <div className="grid grid-cols-2 gap-0 w-full">
                            {widgets?.map((data, idx) => (
                                <WidgetItem key={`widget-${idx}`} widget={data} mode={mode} />
                            ))}
                        </div>
                        <div className="flex-grow" />
                        <div className="grid grid-cols-2 gap-0 w-full">
                            {toolsEnabled ? (
                                <WidgetActionButton
                                    buttonRef={toolsButtonRef}
                                    icon="screwdriver-wrench"
                                    tooltip="Tools"
                                    isOpen={isToolsOpen}
                                    onClick={() => toggleUtilityFlyout("tools")}
                                    mode={mode}
                                    defaultIcon="toolbox"
                                    testID="workspace-tools-button"
                                    style={compatActionStyle}
                                />
                            ) : null}
                            {auditEnabled ? (
                                <WidgetActionButton
                                    buttonRef={auditButtonRef}
                                    icon="clipboard-list"
                                    tooltip="Audit"
                                    isOpen={isAuditOpen}
                                    onClick={() => toggleUtilityFlyout("audit")}
                                    mode={mode}
                                    defaultIcon="list-check"
                                    testID="workspace-audit-button"
                                    style={compatActionStyle}
                                />
                            ) : null}
                            <WidgetActionButton
                                buttonRef={filesButtonRef}
                                icon="folder-open"
                                tooltip="Files"
                                isOpen={isFilesOpen}
                                onClick={() => toggleUtilityFlyout("files")}
                                mode={mode}
                                testID="workspace-files-button"
                                style={compatActionStyle}
                            />
                            <WidgetActionButton
                                buttonRef={quickActionsButtonRef}
                                icon="shapes"
                                tooltip="Launcher"
                                isOpen={isQuickActionsOpen}
                                onClick={() => toggleUtilityFlyout("launcher")}
                                mode={mode}
                                testID="workspace-quick-actions-button"
                                style={compatActionStyle}
                            />
                            {showAppsButton ? (
                                <WidgetActionButton
                                    buttonRef={appsButtonRef}
                                    icon="cube"
                                    tooltip={t("workspace.localWaveApps")}
                                    isOpen={isAppsOpen}
                                    onClick={() => toggleUtilityFlyout("apps")}
                                    mode={mode}
                                    style={compatActionStyle}
                                />
                            ) : null}
                            <WidgetActionButton
                                buttonRef={settingsButtonRef}
                                icon="gear"
                                tooltip={t("workspace.settingsAndHelp")}
                                isOpen={isSettingsOpen}
                                onClick={() => toggleUtilityFlyout("settings")}
                                mode={mode}
                                testID="workspace-settings-button"
                                style={compatActionStyle}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {widgets?.map((data, idx) => (
                            <WidgetItem key={`widget-${idx}`} widget={data} mode={mode} />
                        ))}
                        <div className="flex-grow" />
                        {toolsEnabled ? (
                            <WidgetActionButton
                                buttonRef={toolsButtonRef}
                                icon="screwdriver-wrench"
                                tooltip="Tools"
                                isOpen={isToolsOpen}
                                onClick={() => toggleUtilityFlyout("tools")}
                                mode={mode}
                                label="Tools"
                                defaultIcon="toolbox"
                                testID="workspace-tools-button"
                                style={compatActionStyle}
                            />
                        ) : null}
                        {auditEnabled ? (
                            <WidgetActionButton
                                buttonRef={auditButtonRef}
                                icon="clipboard-list"
                                tooltip="Audit"
                                isOpen={isAuditOpen}
                                onClick={() => toggleUtilityFlyout("audit")}
                                mode={mode}
                                label="Audit"
                                defaultIcon="list-check"
                                testID="workspace-audit-button"
                                style={compatActionStyle}
                            />
                        ) : null}
                        <WidgetActionButton
                            buttonRef={filesButtonRef}
                            icon="folder-open"
                            tooltip="Files"
                            isOpen={isFilesOpen}
                            onClick={() => toggleUtilityFlyout("files")}
                            mode={mode}
                            label="Files"
                            testID="workspace-files-button"
                            style={compatActionStyle}
                        />
                        <WidgetActionButton
                            buttonRef={quickActionsButtonRef}
                            icon="shapes"
                            tooltip="Launcher"
                            isOpen={isQuickActionsOpen}
                            onClick={() => toggleUtilityFlyout("launcher")}
                            mode={mode}
                            label="Launch"
                            testID="workspace-quick-actions-button"
                            style={compatActionStyle}
                        />
                        {showAppsButton ? (
                            <WidgetActionButton
                                buttonRef={appsButtonRef}
                                icon="cube"
                                tooltip={t("workspace.localWaveApps")}
                                isOpen={isAppsOpen}
                                onClick={() => toggleUtilityFlyout("apps")}
                                mode={mode}
                                label={t("workspace.appsLabel")}
                                style={compatActionStyle}
                            />
                        ) : null}
                        <WidgetActionButton
                            buttonRef={settingsButtonRef}
                            icon="gear"
                            tooltip={t("workspace.settingsAndHelp")}
                            isOpen={isSettingsOpen}
                            onClick={() => toggleUtilityFlyout("settings")}
                            mode={mode}
                            testID="workspace-settings-button"
                            style={compatActionStyle}
                        />
                    </>
                )}
                {isDev() ? (
                    <div
                        className="flex justify-center items-center w-full py-1 text-accent text-[24px]"
                        title="Running TideTerm Dev Build"
                    >
                        <i className="fa fa-brands fa-dev fa-fw" />
                    </div>
                ) : null}
            </div>
            {showAppsButton && appsButtonRef.current && (
                <AppsFloatingWindow
                    isOpen={isAppsOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={appsButtonRef.current}
                />
            )}
            {toolsEnabled && toolsButtonRef.current && (
                <ToolsFloatingWindow
                    isOpen={isToolsOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={toolsButtonRef.current}
                    onAuditChanged={() => setAuditRefreshNonce((current) => current + 1)}
                    showMCP={mcpEnabled}
                />
            )}
            {auditEnabled && auditButtonRef.current && (
                <AuditFloatingWindow
                    isOpen={isAuditOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={auditButtonRef.current}
                    refreshNonce={auditRefreshNonce}
                />
            )}
            {filesButtonRef.current && (
                <FilesFloatingWindow
                    isOpen={isFilesOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={filesButtonRef.current}
                />
            )}
            {quickActionsButtonRef.current && (
                <QuickActionsFloatingWindow
                    isOpen={isQuickActionsOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={quickActionsButtonRef.current}
                    onRunAction={runQuickAction}
                    launcherEntries={launcherEntries}
                    onRunLauncherEntry={async (entry) => runLauncherEntry(entry)}
                />
            )}
            {settingsButtonRef.current && (
                <SettingsFloatingWindow
                    isOpen={isSettingsOpen}
                    onClose={() => setOpenUtilityFlyout(null)}
                    referenceElement={settingsButtonRef.current}
                    onOpenTools={toolsEnabled ? () => toggleUtilityFlyout("tools") : undefined}
                />
            )}

            <WidgetsMeasurement
                measurementRef={measurementRef}
                widgets={widgets}
                showToolsButton={toolsEnabled}
                showAuditButton={auditEnabled}
                showAppsButton={showAppsButton}
                showQuickActionsButton={true}
                showDevBadge={isDev()}
                appsLabel={t("workspace.appsLabel")}
                filesLabel="Files"
                quickActionsLabel="Launch"
                settingsLabel={t("workspace.settingsLabel")}
                style={compatMeasurementStyle}
            />
        </>
    );
});

export { Widgets };
