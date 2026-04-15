// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Tooltip } from "@/app/element/tooltip";
import { useT } from "@/app/i18n/i18n";
import { ContextMenuModel } from "@/app/store/contextmenu";
import { atoms, createBlock, isDev } from "@/store/global";
import { fireAndForget, makeIconClass } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AppsFloatingWindow } from "./apps-floating-window";
import { AuditFloatingWindow } from "./audit-floating-window";
import { SettingsFloatingWindow } from "./settings-floating-window";
import { ToolsFloatingWindow } from "./tools-floating-window";
import { sortByDisplayOrder } from "./widget-helpers";
import { WidgetItem } from "./widget-item";
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
                            <WidgetItem key={`widget-${idx}`} widget={data} mode={mode} />
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
                    <WidgetItem key={`measurement-widget-${idx}`} widget={data} mode="normal" />
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
