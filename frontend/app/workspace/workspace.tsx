// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { AIPanel } from "@/app/aipanel/aipanel";
import { setWaveAICompatContext } from "@/app/aipanel/compat-context";
import { ErrorBoundary } from "@/app/element/errorboundary";
import { CenteredDiv } from "@/app/element/quickelems";
import { ModalsRenderer } from "@/app/modals/modalsrenderer";
import { WorkspaceStoreSnapshot, workspaceStore } from "@/app/state/workspace.store";
import { TabBar } from "@/app/tab/tabbar";
import { TabContent } from "@/app/tab/tabcontent";
import { Widgets } from "@/app/workspace/widgets";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { atoms, getApi } from "@/store/global";
import { fireAndForget } from "@/util/util";
import { useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator, type GroupImperativeHandle, type Layout as PanelLayout, type PanelImperativeHandle } from "react-resizable-panels";
import { WorkspaceAIPanelId, WorkspaceMainPanelId } from "./workspace-layout-model";

const WorkspaceElem = memo(({ compatMode = false }: { compatMode?: boolean }) => {
    const workspaceLayoutModel = WorkspaceLayoutModel.getInstance();
    const staticTabId = useAtomValue(atoms.staticTabId);
    const aiPanelVisible = useAtomValue(workspaceLayoutModel.panelVisibleAtom);
    const [workspace, setWorkspace] = useState<WorkspaceStoreSnapshot["active"]>(workspaceStore.getSnapshot().active);
    setWaveAICompatContext(compatMode, workspace.activetabid ?? "");
    const tabId = compatMode ? workspace.activetabid : staticTabId;
    const initialAiPanelPercentage = workspaceLayoutModel.getAIPanelPercentage(window.innerWidth);
    const initialLayout: PanelLayout = {
        [WorkspaceAIPanelId]: initialAiPanelPercentage,
        [WorkspaceMainPanelId]: 100 - initialAiPanelPercentage,
    };
    const panelGroupHandleRef = useRef<GroupImperativeHandle | null>(null);
    const aiPanelHandleRef = useRef<PanelImperativeHandle | null>(null);
    const panelContainerElementRef = useRef<HTMLDivElement | null>(null);
    const aiPanelWrapperElementRef = useRef<HTMLDivElement | null>(null);
    const refsTabIdRef = useRef<string | null>(null);
    const latestTabIdRef = useRef(tabId);
    latestTabIdRef.current = tabId;
    if (refsTabIdRef.current !== tabId) {
        refsTabIdRef.current = tabId;
        panelGroupHandleRef.current = null;
        aiPanelHandleRef.current = null;
        panelContainerElementRef.current = null;
        aiPanelWrapperElementRef.current = null;
    }
    const compatWorkspaceStyle = compatMode
        ? ({ display: "flex", flexDirection: "column", width: "100%", flexGrow: 1, overflow: "hidden" } as const)
        : undefined;
    const compatPanelContainerStyle = compatMode
        ? ({ display: "flex", flexDirection: "row", flexGrow: 1, overflow: "hidden" } as const)
        : undefined;
    const compatMainContentStyle = compatMode
        ? ({ display: "flex", flexDirection: "row", height: "100%", overflow: "hidden" } as const)
        : undefined;
    const compatAIPanelWrapperStyle = compatMode ? ({ width: "100%", height: "100%", overflow: "hidden" } as const) : undefined;

    const syncLayoutModelRefs = useCallback(() => {
        if (
            aiPanelHandleRef.current &&
            panelGroupHandleRef.current &&
            panelContainerElementRef.current &&
            aiPanelWrapperElementRef.current
        ) {
            workspaceLayoutModel.registerRefs(
                aiPanelHandleRef.current,
                panelGroupHandleRef.current,
                panelContainerElementRef.current,
                aiPanelWrapperElementRef.current
            );
            return;
        }
        workspaceLayoutModel.unregisterRefs();
    }, [workspaceLayoutModel]);

    const setPanelGroupRef = useCallback(
        (value: GroupImperativeHandle | null) => {
            if (tabId !== latestTabIdRef.current) {
                return;
            }
            panelGroupHandleRef.current = value;
            syncLayoutModelRefs();
        },
        [syncLayoutModelRefs, tabId]
    );

    const setAIPanelRef = useCallback(
        (value: PanelImperativeHandle | null) => {
            if (tabId !== latestTabIdRef.current) {
                return;
            }
            aiPanelHandleRef.current = value;
            syncLayoutModelRefs();
        },
        [syncLayoutModelRefs, tabId]
    );

    const setPanelContainerRef = useCallback(
        (value: HTMLDivElement | null) => {
            if (tabId !== latestTabIdRef.current) {
                return;
            }
            panelContainerElementRef.current = value;
            syncLayoutModelRefs();
        },
        [syncLayoutModelRefs, tabId]
    );

    const setAIPanelWrapperRef = useCallback(
        (value: HTMLDivElement | null) => {
            if (tabId !== latestTabIdRef.current) {
                return;
            }
            aiPanelWrapperElementRef.current = value;
            syncLayoutModelRefs();
        },
        [syncLayoutModelRefs, tabId]
    );

    useEffect(() => {
        const isVisible = workspaceLayoutModel.getAIPanelVisible();
        getApi().setWaveAIOpen(isVisible);
    }, [workspaceLayoutModel]);

    useEffect(() => () => workspaceLayoutModel.unregisterRefs(), [workspaceLayoutModel]);

    useEffect(() => {
        window.addEventListener("resize", workspaceLayoutModel.handleWindowResize);
        return () => window.removeEventListener("resize", workspaceLayoutModel.handleWindowResize);
    }, [workspaceLayoutModel]);

    useEffect(() => {
        workspaceStore.setCompatMode(compatMode);
        fireAndForget(() => workspaceStore.refresh());
        if (!compatMode) {
            fireAndForget(() => workspaceStore.refreshWorkspaceList());
        }
        setWorkspace(workspaceStore.getSnapshot().active);
        const unsubscribe = workspaceStore.subscribe((snapshot) => {
            setWorkspace(snapshot.active);
        });
        return () => {
            unsubscribe();
            workspaceStore.setCompatMode(false);
        };
    }, [compatMode]);

    return (
        <div className="flex flex-col w-full flex-grow overflow-hidden" style={compatWorkspaceStyle}>
            <TabBar key={workspace.oid} workspace={workspace} compatMode={compatMode} />
            <div ref={setPanelContainerRef} className="flex flex-row flex-grow overflow-hidden" style={compatPanelContainerStyle}>
                <ErrorBoundary key={tabId}>
                    <Group
                        orientation="horizontal"
                        defaultLayout={initialLayout}
                        onLayoutChanged={workspaceLayoutModel.handlePanelLayout}
                        groupRef={setPanelGroupRef}
                    >
                        <Panel
                            id={WorkspaceAIPanelId}
                            panelRef={setAIPanelRef}
                            collapsible
                            defaultSize={initialAiPanelPercentage}
                            className="overflow-hidden"
                        >
                            <div ref={setAIPanelWrapperRef} className="w-full h-full" style={compatAIPanelWrapperStyle}>
                                {tabId !== "" && aiPanelVisible && <AIPanel />}
                            </div>
                        </Panel>
                        <Separator className="w-0.5 bg-transparent hover:bg-zinc-500/20 transition-colors" />
                        <Panel id={WorkspaceMainPanelId} defaultSize={100 - initialAiPanelPercentage}>
                            {tabId === "" ? (
                                <CenteredDiv>No Active Tab</CenteredDiv>
                            ) : (
                                <div className="flex flex-row h-full" style={compatMainContentStyle}>
                                    <TabContent key={`${tabId}:${workspace.activewidgetid}`} tabId={tabId} compatWorkspace={compatMode ? workspace : undefined} />
                                    <Widgets compatMode={compatMode} />
                                </div>
                            )}
                        </Panel>
                    </Group>
                    {!compatMode && <ModalsRenderer />}
                </ErrorBoundary>
            </div>
        </div>
    );
});

WorkspaceElem.displayName = "WorkspaceElem";

export { WorkspaceElem as Workspace };
