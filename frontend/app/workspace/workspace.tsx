// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { AIPanel } from "@/app/aipanel/aipanel";
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
import { memo, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator, type GroupImperativeHandle, type Layout as PanelLayout, type PanelImperativeHandle } from "react-resizable-panels";
import { WorkspaceAIPanelId, WorkspaceMainPanelId } from "./workspace-layout-model";

const WorkspaceElem = memo(({ compatMode = false }: { compatMode?: boolean }) => {
    const workspaceLayoutModel = WorkspaceLayoutModel.getInstance();
    const staticTabId = useAtomValue(atoms.staticTabId);
    const [workspace, setWorkspace] = useState<WorkspaceStoreSnapshot["active"]>(workspaceStore.getSnapshot().active);
    const tabId = compatMode ? workspace.activetabid : staticTabId;
    const initialAiPanelPercentage = compatMode ? 0 : workspaceLayoutModel.getAIPanelPercentage(window.innerWidth);
    const initialLayout: PanelLayout = {
        [WorkspaceAIPanelId]: initialAiPanelPercentage,
        [WorkspaceMainPanelId]: 100 - initialAiPanelPercentage,
    };
    const panelGroupRef = useRef<GroupImperativeHandle>(null);
    const aiPanelRef = useRef<PanelImperativeHandle>(null);
    const panelContainerRef = useRef<HTMLDivElement>(null);
    const aiPanelWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (compatMode) {
            return;
        }
        if (aiPanelRef.current && panelGroupRef.current && panelContainerRef.current && aiPanelWrapperRef.current) {
            workspaceLayoutModel.registerRefs(
                aiPanelRef.current,
                panelGroupRef.current,
                panelContainerRef.current,
                aiPanelWrapperRef.current
            );
        }
    }, []);

    useEffect(() => {
        const isVisible = compatMode ? false : workspaceLayoutModel.getAIPanelVisible();
        getApi().setWaveAIOpen(isVisible);
    }, [compatMode, workspaceLayoutModel]);

    useEffect(() => {
        if (compatMode) {
            return;
        }
        window.addEventListener("resize", workspaceLayoutModel.handleWindowResize);
        return () => window.removeEventListener("resize", workspaceLayoutModel.handleWindowResize);
    }, [compatMode, workspaceLayoutModel]);

    useEffect(() => {
        fireAndForget(() => workspaceStore.refresh());
        if (!compatMode) {
            fireAndForget(() => workspaceStore.refreshWorkspaceList());
        }
        setWorkspace(workspaceStore.getSnapshot().active);
        return workspaceStore.subscribe((snapshot) => {
            setWorkspace(snapshot.active);
        });
    }, [compatMode]);

    return (
        <div className="flex flex-col w-full flex-grow overflow-hidden">
            <TabBar key={workspace.oid} workspace={workspace} compatMode={compatMode} />
            <div ref={panelContainerRef} className="flex flex-row flex-grow overflow-hidden">
                <ErrorBoundary key={tabId}>
                    <Group
                        orientation="horizontal"
                        defaultLayout={initialLayout}
                        onLayoutChanged={workspaceLayoutModel.handlePanelLayout}
                        groupRef={panelGroupRef}
                    >
                        <Panel
                            id={WorkspaceAIPanelId}
                            panelRef={aiPanelRef}
                            collapsible
                            defaultSize={initialAiPanelPercentage}
                            className="overflow-hidden"
                        >
                            <div ref={aiPanelWrapperRef} className="w-full h-full">
                                {!compatMode && tabId !== "" && <AIPanel />}
                            </div>
                        </Panel>
                        <Separator className="w-0.5 bg-transparent hover:bg-zinc-500/20 transition-colors" />
                        <Panel id={WorkspaceMainPanelId} defaultSize={100 - initialAiPanelPercentage}>
                            {tabId === "" ? (
                                <CenteredDiv>No Active Tab</CenteredDiv>
                            ) : (
                                <div className="flex flex-row h-full">
                                    <TabContent key={`${tabId}:${workspace.activewidgetid}`} tabId={tabId} compatWorkspace={compatMode ? workspace : undefined} />
                                    <Widgets />
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
