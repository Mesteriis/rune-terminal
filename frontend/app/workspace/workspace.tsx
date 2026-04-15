// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { AIPanel } from "@/app/aipanel/aipanel";
import { ErrorBoundary } from "@/app/element/errorboundary";
import { CenteredDiv } from "@/app/element/quickelems";
import { ModalsRenderer } from "@/app/modals/modalsrenderer";
import { TabBar } from "@/app/tab/tabbar";
import { TabContent } from "@/app/tab/tabcontent";
import { Widgets } from "@/app/workspace/widgets";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { atoms, getApi } from "@/store/global";
import { useAtomValue } from "jotai";
import { memo, useEffect, useRef } from "react";
import { Group, Panel, Separator, type GroupImperativeHandle, type Layout as PanelLayout, type PanelImperativeHandle } from "react-resizable-panels";
import { WorkspaceAIPanelId, WorkspaceMainPanelId } from "./workspace-layout-model";

const WorkspaceElem = memo(() => {
    const workspaceLayoutModel = WorkspaceLayoutModel.getInstance();
    const tabId = useAtomValue(atoms.staticTabId);
    const ws = useAtomValue(atoms.workspace);
    const initialAiPanelPercentage = workspaceLayoutModel.getAIPanelPercentage(window.innerWidth);
    const initialLayout: PanelLayout = {
        [WorkspaceAIPanelId]: initialAiPanelPercentage,
        [WorkspaceMainPanelId]: 100 - initialAiPanelPercentage,
    };
    const panelGroupRef = useRef<GroupImperativeHandle>(null);
    const aiPanelRef = useRef<PanelImperativeHandle>(null);
    const panelContainerRef = useRef<HTMLDivElement>(null);
    const aiPanelWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
        const isVisible = workspaceLayoutModel.getAIPanelVisible();
        getApi().setWaveAIOpen(isVisible);
    }, []);

    useEffect(() => {
        window.addEventListener("resize", workspaceLayoutModel.handleWindowResize);
        return () => window.removeEventListener("resize", workspaceLayoutModel.handleWindowResize);
    }, []);

    return (
        <div className="flex flex-col w-full flex-grow overflow-hidden">
            <TabBar key={ws.oid} workspace={ws} />
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
                                {tabId !== "" && <AIPanel />}
                            </div>
                        </Panel>
                        <Separator className="w-0.5 bg-transparent hover:bg-zinc-500/20 transition-colors" />
                        <Panel id={WorkspaceMainPanelId} defaultSize={100 - initialAiPanelPercentage}>
                            {tabId === "" ? (
                                <CenteredDiv>No Active Tab</CenteredDiv>
                            ) : (
                                <div className="flex flex-row h-full">
                                    <TabContent key={tabId} tabId={tabId} />
                                    <Widgets />
                                </div>
                            )}
                        </Panel>
                    </Group>
                    <ModalsRenderer />
                </ErrorBoundary>
            </div>
        </div>
    );
});

WorkspaceElem.displayName = "WorkspaceElem";

export { WorkspaceElem as Workspace };
