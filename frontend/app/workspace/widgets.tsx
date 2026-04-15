// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { useT } from "@/app/i18n/i18n";
import { ContextMenuModel } from "@/app/store/contextmenu";
import { atoms, createBlock, isDev } from "@/store/global";
import { fireAndForget } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AppsFloatingWindow } from "./apps-floating-window";
import { AuditFloatingWindow } from "./audit-floating-window";
import { SettingsFloatingWindow } from "./settings-floating-window";
import { ToolsFloatingWindow } from "./tools-floating-window";
import { WidgetActionButton } from "./widget-action-button";
import { sortByDisplayOrder } from "./widget-helpers";
import { WidgetItem } from "./widget-item";
import { WidgetsMeasurement } from "./widgets-measurement";
import type { WidgetDisplayMode } from "./widget-types";

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

        setMode((prevMode) => (newMode !== prevMode ? newMode : prevMode));
    }, [showAppsButton, widgets]);

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
                                <WidgetItem key={`widget-${idx}`} widget={data} mode={mode} />
                            ))}
                        </div>
                        <div className="flex-grow" />
                        <div className="grid grid-cols-2 gap-0 w-full">
                            <WidgetActionButton
                                buttonRef={toolsButtonRef}
                                icon="screwdriver-wrench"
                                tooltip="Tools"
                                isOpen={isToolsOpen}
                                onClick={() => setIsToolsOpen(!isToolsOpen)}
                                mode={mode}
                                defaultIcon="toolbox"
                                style={compatActionStyle}
                            />
                            <WidgetActionButton
                                buttonRef={auditButtonRef}
                                icon="clipboard-list"
                                tooltip="Audit"
                                isOpen={isAuditOpen}
                                onClick={() => setIsAuditOpen(!isAuditOpen)}
                                mode={mode}
                                defaultIcon="list-check"
                                style={compatActionStyle}
                            />
                            {showAppsButton ? (
                                <WidgetActionButton
                                    buttonRef={appsButtonRef}
                                    icon="cube"
                                    tooltip={t("workspace.localWaveApps")}
                                    isOpen={isAppsOpen}
                                    onClick={() => setIsAppsOpen(!isAppsOpen)}
                                    mode={mode}
                                    style={compatActionStyle}
                                />
                            ) : null}
                            <WidgetActionButton
                                buttonRef={settingsButtonRef}
                                icon="gear"
                                tooltip={t("workspace.settingsAndHelp")}
                                isOpen={isSettingsOpen}
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                mode={mode}
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
                        <WidgetActionButton
                            buttonRef={toolsButtonRef}
                            icon="screwdriver-wrench"
                            tooltip="Tools"
                            isOpen={isToolsOpen}
                            onClick={() => setIsToolsOpen(!isToolsOpen)}
                            mode={mode}
                            label="Tools"
                            defaultIcon="toolbox"
                            style={compatActionStyle}
                        />
                        <WidgetActionButton
                            buttonRef={auditButtonRef}
                            icon="clipboard-list"
                            tooltip="Audit"
                            isOpen={isAuditOpen}
                            onClick={() => setIsAuditOpen(!isAuditOpen)}
                            mode={mode}
                            label="Audit"
                            defaultIcon="list-check"
                            style={compatActionStyle}
                        />
                        {showAppsButton ? (
                            <WidgetActionButton
                                buttonRef={appsButtonRef}
                                icon="cube"
                                tooltip={t("workspace.localWaveApps")}
                                isOpen={isAppsOpen}
                                onClick={() => setIsAppsOpen(!isAppsOpen)}
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
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            mode={mode}
                            style={compatActionStyle}
                        />
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

            <WidgetsMeasurement
                measurementRef={measurementRef}
                widgets={widgets}
                showAppsButton={showAppsButton}
                showDevBadge={isDev()}
                appsLabel={t("workspace.appsLabel")}
                settingsLabel={t("workspace.settingsLabel")}
                style={compatMeasurementStyle}
            />
        </>
    );
});

export { Widgets };
