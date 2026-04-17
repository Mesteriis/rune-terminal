// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { WaveAIModel } from "@/app/aipanel/waveai-model";
import { isWaveAICompatRuntime } from "@/app/aipanel/compat-context";
import type { WorkspaceStoreLayout } from "@/app/state/workspace.store";
import { globalStore } from "@/app/store/jotaiStore";
import * as WOS from "@/app/store/wos";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { getLayoutModelForStaticTab } from "@/layout/lib/layoutModelHooks";
import { atoms, getApi, getOrefMetaKeyAtom, recordTEvent, refocusNode } from "@/store/global";
import * as jotai from "jotai";
import { debounce } from "lodash-es";
import type { GroupImperativeHandle, Layout as PanelLayout, PanelImperativeHandle } from "react-resizable-panels";
const WorkspaceAIPanelId = "workspace-ai-panel";
const WorkspaceMainPanelId = "workspace-main-panel";

const AIPANEL_DEFAULTWIDTH = 300;
const AIPANEL_DEFAULTWIDTHRATIO = 0.33;
const AIPANEL_MINWIDTH = 300;
const AIPANEL_MAXWIDTHRATIO = 0.66;

function isCompatRuntime(): boolean {
    return isWaveAICompatRuntime();
}

class WorkspaceLayoutModel {
    private static instance: WorkspaceLayoutModel | null = null;

    aiPanelRef: PanelImperativeHandle | null;
    panelGroupRef: GroupImperativeHandle | null;
    panelContainerRef: HTMLDivElement | null;
    aiPanelWrapperRef: HTMLDivElement | null;
    inResize: boolean; // prevents recursive setLayout calls (setLayout triggers onLayout which calls setLayout)
    private aiPanelVisible: boolean;
    private aiPanelWidth: number | null;
    private debouncedPersistWidth: (width: number) => void;
    private initialized: boolean = false;
    private transitionTimeoutRef: NodeJS.Timeout | null = null;
    private focusTimeoutRef: NodeJS.Timeout | null = null;
    panelVisibleAtom: jotai.PrimitiveAtom<boolean>;

    private constructor() {
        this.aiPanelRef = null;
        this.panelGroupRef = null;
        this.panelContainerRef = null;
        this.aiPanelWrapperRef = null;
        this.inResize = false;
        this.aiPanelVisible = false;
        this.aiPanelWidth = null;
        this.panelVisibleAtom = jotai.atom(this.aiPanelVisible);

        this.handleWindowResize = this.handleWindowResize.bind(this);
        this.handlePanelLayout = this.handlePanelLayout.bind(this);

        this.debouncedPersistWidth = debounce((width: number) => {
            if (isCompatRuntime()) {
                return;
            }
            try {
                RpcApi.SetMetaCommand(TabRpcClient, {
                    oref: WOS.makeORef("tab", this.getTabId()),
                    meta: { "waveai:panelwidth": width },
                });
            } catch (e) {
                console.warn("Failed to persist panel width:", e);
            }
        }, 300);
    }

    static getInstance(): WorkspaceLayoutModel {
        if (!WorkspaceLayoutModel.instance) {
            WorkspaceLayoutModel.instance = new WorkspaceLayoutModel();
        }
        return WorkspaceLayoutModel.instance;
    }

    private initializeFromTabMeta(): void {
        if (this.initialized) return;
        if (isCompatRuntime()) {
            return;
        }
        this.initialized = true;

        try {
            const savedVisible = globalStore.get(this.getPanelOpenAtom());
            const savedWidth = globalStore.get(this.getPanelWidthAtom());

            if (savedVisible != null) {
                this.aiPanelVisible = savedVisible;
                globalStore.set(this.panelVisibleAtom, savedVisible);
            }
            if (savedWidth != null) {
                this.aiPanelWidth = savedWidth;
            }
        } catch (e) {
            console.warn("Failed to initialize from tab meta:", e);
        }
    }

    private getTabId(): string {
        return globalStore.get(atoms.staticTabId);
    }

    private getPanelOpenAtom(): jotai.Atom<boolean | undefined> {
        const tabORef = WOS.makeORef("tab", this.getTabId());
        return getOrefMetaKeyAtom(tabORef, "waveai:panelopen");
    }

    private getPanelWidthAtom(): jotai.Atom<number | undefined> {
        const tabORef = WOS.makeORef("tab", this.getTabId());
        return getOrefMetaKeyAtom(tabORef, "waveai:panelwidth");
    }

    registerRefs(
        aiPanelRef: PanelImperativeHandle,
        panelGroupRef: GroupImperativeHandle,
        panelContainerRef: HTMLDivElement,
        aiPanelWrapperRef: HTMLDivElement
    ): void {
        this.aiPanelRef = aiPanelRef;
        this.panelGroupRef = panelGroupRef;
        this.panelContainerRef = panelContainerRef;
        this.aiPanelWrapperRef = aiPanelWrapperRef;
        this.syncAIPanelRef();
        this.updateWrapperWidth();
    }

    unregisterRefs(): void {
        this.aiPanelRef = null;
        this.panelGroupRef = null;
        this.panelContainerRef = null;
        this.aiPanelWrapperRef = null;
        this.inResize = false;
        if (this.transitionTimeoutRef) {
            clearTimeout(this.transitionTimeoutRef);
            this.transitionTimeoutRef = null;
        }
    }

    updateWrapperWidth(): void {
        if (!this.aiPanelWrapperRef) {
            return;
        }
        if (!this.getAIPanelVisible()) {
            this.aiPanelWrapperRef.style.width = "0px";
            return;
        }
        const width = this.getAIPanelWidth();
        const clampedWidth = this.getClampedAIPanelWidth(width, window.innerWidth);
        this.aiPanelWrapperRef.style.width = `${clampedWidth}px`;
    }

    enableTransitions(duration: number): void {
        if (!this.panelContainerRef) {
            return;
        }
        const panels = this.panelContainerRef.querySelectorAll("[data-panel]");
        panels.forEach((panel) => {
            if (panel instanceof HTMLElement) {
                panel.style.transition = "flex 0.2s ease-in-out";
            }
        });

        if (this.transitionTimeoutRef) {
            clearTimeout(this.transitionTimeoutRef);
        }
        this.transitionTimeoutRef = setTimeout(() => {
            if (!this.panelContainerRef) {
                return;
            }
            const panels = this.panelContainerRef.querySelectorAll("[data-panel]");
            panels.forEach((panel) => {
                if (panel instanceof HTMLElement) {
                    panel.style.transition = "none";
                }
            });
        }, duration);
    }

    private makePanelLayout(windowWidth: number): PanelLayout {
        return {
            [WorkspaceAIPanelId]: this.getAIPanelPercentage(windowWidth),
            [WorkspaceMainPanelId]: this.getMainContentPercentage(windowWidth),
        };
    }

    handleWindowResize(): void {
        if (!this.panelGroupRef) {
            return;
        }
        const newWindowWidth = window.innerWidth;
        this.inResize = true;
        this.panelGroupRef.setLayout(this.makePanelLayout(newWindowWidth));
        this.inResize = false;
        this.updateWrapperWidth();
    }

    handlePanelLayout(layout: PanelLayout): void {
        // dlog("handlePanelLayout", "inResize:", this.inResize, "sizes:", sizes);
        if (this.inResize) {
            return;
        }
        if (!this.panelGroupRef) {
            return;
        }

        const currentWindowWidth = window.innerWidth;
        const aiPanelSize = layout[WorkspaceAIPanelId] ?? 0;
        const aiPanelPixelWidth = (aiPanelSize / 100) * currentWindowWidth;
        this.handleAIPanelResize(aiPanelPixelWidth, currentWindowWidth);
        this.inResize = true;
        this.panelGroupRef.setLayout(this.makePanelLayout(currentWindowWidth));
        this.inResize = false;
        this.updateWrapperWidth();
    }

    syncAIPanelRef(): void {
        if (!this.aiPanelRef || !this.panelGroupRef) {
            return;
        }

        const currentWindowWidth = window.innerWidth;
        if (this.getAIPanelVisible()) {
            this.aiPanelRef.expand();
        } else {
            this.aiPanelRef.collapse();
        }

        this.inResize = true;
        this.panelGroupRef.setLayout(this.makePanelLayout(currentWindowWidth));
        this.inResize = false;
        this.updateWrapperWidth();
    }

    getMaxAIPanelWidth(windowWidth: number): number {
        return Math.floor(windowWidth * AIPANEL_MAXWIDTHRATIO);
    }

    getClampedAIPanelWidth(width: number, windowWidth: number): number {
        const maxWidth = this.getMaxAIPanelWidth(windowWidth);
        if (AIPANEL_MINWIDTH > maxWidth) {
            return AIPANEL_MINWIDTH;
        }
        return Math.max(AIPANEL_MINWIDTH, Math.min(width, maxWidth));
    }

    getAIPanelVisible(): boolean {
        this.initializeFromTabMeta();
        return this.aiPanelVisible;
    }

    applyWorkspaceLayout(layout: WorkspaceStoreLayout | null | undefined): void {
        if (layout == null) {
            return;
        }
        const aiVisible = layout.surfaces.some((surface) => surface.id === "ai");
        if (this.aiPanelVisible === aiVisible) {
            return;
        }
        this.aiPanelVisible = aiVisible;
        globalStore.set(this.panelVisibleAtom, aiVisible);
        getApi().setWaveAIOpen(aiVisible);
        this.syncAIPanelRef();
    }

    setAIPanelVisible(visible: boolean, opts?: { nofocus?: boolean }): void {
        if (this.focusTimeoutRef != null) {
            clearTimeout(this.focusTimeoutRef);
            this.focusTimeoutRef = null;
        }
        const wasVisible = this.aiPanelVisible;
        this.aiPanelVisible = visible;
        if (visible && !wasVisible) {
            recordTEvent("action:openwaveai");
        }
        globalStore.set(this.panelVisibleAtom, visible);
        getApi().setWaveAIOpen(visible);
        if (!isCompatRuntime()) {
            RpcApi.SetMetaCommand(TabRpcClient, {
                oref: WOS.makeORef("tab", this.getTabId()),
                meta: { "waveai:panelopen": visible },
            });
        }
        this.enableTransitions(250);
        this.syncAIPanelRef();

        if (visible) {
            if (!opts?.nofocus) {
                this.focusTimeoutRef = setTimeout(() => {
                    WaveAIModel.getInstance().focusInput();
                    this.focusTimeoutRef = null;
                }, 350);
            }
        } else {
            if (isCompatRuntime()) {
                return;
            }
            const layoutModel = getLayoutModelForStaticTab();
            const focusedNode = globalStore.get(layoutModel.focusedNode);
            if (focusedNode == null) {
                layoutModel.focusFirstNode();
                return;
            }
            const blockId = focusedNode?.data?.blockId;
            if (blockId != null) {
                refocusNode(blockId);
            }
        }
    }

    getAIPanelWidth(): number {
        this.initializeFromTabMeta();
        if (this.aiPanelWidth == null) {
            this.aiPanelWidth = Math.max(AIPANEL_DEFAULTWIDTH, window.innerWidth * AIPANEL_DEFAULTWIDTHRATIO);
        }
        return this.aiPanelWidth;
    }

    setAIPanelWidth(width: number): void {
        this.aiPanelWidth = width;
        this.updateWrapperWidth();
        this.debouncedPersistWidth(width);
    }

    getAIPanelPercentage(windowWidth: number): number {
        const isVisible = this.getAIPanelVisible();
        if (!isVisible) {
            return 0;
        }
        const aiPanelWidth = this.getAIPanelWidth();
        const clampedWidth = this.getClampedAIPanelWidth(aiPanelWidth, windowWidth);
        const percentage = (clampedWidth / windowWidth) * 100;
        return Math.max(0, Math.min(percentage, 100));
    }

    getMainContentPercentage(windowWidth: number): number {
        const aiPanelPercentage = this.getAIPanelPercentage(windowWidth);
        return Math.max(0, 100 - aiPanelPercentage);
    }

    handleAIPanelResize(width: number, windowWidth: number): void {
        if (!this.getAIPanelVisible()) {
            return;
        }
        const clampedWidth = this.getClampedAIPanelWidth(width, windowWidth);
        this.setAIPanelWidth(clampedWidth);
    }
}

export { WorkspaceAIPanelId, WorkspaceLayoutModel, WorkspaceMainPanelId };
