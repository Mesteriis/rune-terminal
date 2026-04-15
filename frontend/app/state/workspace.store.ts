import type { WorkspaceTabMutation, WorkspaceSnapshot, WorkspaceTab } from "@/rterm-api/workspace/types";
import { atoms, getApi, globalStore } from "@/store/global";
import { WorkspaceService } from "@/app/store/services";
import { waveEventSubscribe } from "@/app/store/wps";
import { getWorkspaceFacade } from "@/compat/workspace";
import { fireAndForget } from "@/util/util";
type LegacyWorkspace = Workspace;

export type WorkspaceStoreListener = (snapshot: WorkspaceStoreSnapshot) => void;

export interface WorkspaceSummary {
    name: string;
    icon: string;
    color: string;
    oid: string;
}

export interface WorkspaceListEntry {
    windowId: string;
    workspace: WorkspaceSummary;
}

export interface WorkspaceStoreSnapshot {
    active: WorkspaceSummary & {
        tabids: string[];
        pinnedtabids: string[];
        activetabid: string;
        oid: string;
    };
    list: WorkspaceListEntry[];
    colors: string[];
    icons: string[];
}

const defaultWorkspaceSummary: WorkspaceSummary = {
    oid: "",
    name: "",
    icon: "",
    color: "",
};

type ApiWorkspace = WorkspaceSnapshot;

interface WorkspaceStoreState {
    active: WorkspaceStoreSnapshot["active"];
    list: WorkspaceListEntry[];
    colors: string[];
    icons: string[];
}

function toWorkspaceSummary(workspace?: Partial<WorkspaceSummary> | null): WorkspaceSummary {
    const normalizedWorkspace: Partial<WorkspaceSummary> = workspace ?? {};
    return {
        oid: normalizedWorkspace.oid ?? "",
        name: normalizedWorkspace.name ?? "",
        icon: normalizedWorkspace.icon ?? "",
        color: normalizedWorkspace.color ?? "",
    };
}

function getLegacyWorkspaceFromAtoms(): LegacyWorkspace | null {
    if (atoms == null) {
        return null;
    }
    const workspace = globalStore.get(atoms.workspace);
    return (workspace as LegacyWorkspace | null) ?? null;
}

function adaptWorkspaceFromApi(apiWorkspace: ApiWorkspace, fallback?: LegacyWorkspace | null): WorkspaceStoreSnapshot["active"] {
    const legacyWorkspace = fallback ?? null;
    const tabs: WorkspaceTab[] = apiWorkspace?.tabs ?? [];
    const pinnedtabids = tabs.filter((tab) => tab.pinned).map((tab) => tab.id);
    const tabids = tabs.filter((tab) => !tab.pinned).map((tab) => tab.id);
    return {
        oid: apiWorkspace?.id ?? legacyWorkspace?.oid ?? "",
        name: apiWorkspace?.name ?? legacyWorkspace?.name ?? "",
        icon: legacyWorkspace?.icon ?? "",
        color: legacyWorkspace?.color ?? "",
        tabids,
        pinnedtabids,
        activetabid: apiWorkspace?.active_tab_id ?? legacyWorkspace?.activetabid ?? "",
    };
}

function adaptWorkspaceListEntry(
    workspaceId: string,
    windowId: string,
    workspace: {
        oid?: string;
        name?: string;
        icon?: string;
        color?: string;
    } | null
): WorkspaceListEntry {
    const fallback = toWorkspaceSummary({
        oid: workspaceId,
        name: workspace?.name ?? "",
        icon: workspace?.icon ?? "",
        color: workspace?.color ?? "",
    });
    return {
        windowId: windowId,
        workspace: {
            ...fallback,
            oid: workspace?.oid ?? workspaceId,
            name: fallback.name,
            icon: fallback.icon,
            color: fallback.color,
        },
    };
}

class WorkspaceStore {
    private state: WorkspaceStoreState;
    private listeners = new Set<WorkspaceStoreListener>();
    private refreshPromise: Promise<void> | null = null;
    private listRefreshPromise: Promise<void> | null = null;
    private themeRefreshPromise: Promise<{ colors: string[]; icons: string[] }> | null = null;
    private workspaceUpdateUnsub: (() => void) | null = null;
    private globalWorkspaceUnsub: (() => void) | null = null;

    constructor() {
        const initialWorkspace = getLegacyWorkspaceFromAtoms();
        this.state = {
            active: {
                ...defaultWorkspaceSummary,
                ...toWorkspaceSummary(initialWorkspace),
                tabids: Array.isArray(initialWorkspace?.tabids) ? [...initialWorkspace.tabids] : [],
                pinnedtabids: Array.isArray(initialWorkspace?.pinnedtabids) ? [...initialWorkspace.pinnedtabids] : [],
                activetabid: initialWorkspace?.activetabid ?? "",
            },
            list: [],
            colors: [],
            icons: [],
        };

        this.handleGlobalWorkspaceUpdate = this.handleGlobalWorkspaceUpdate.bind(this);
        this.subscribeToSourceEvents();
    }

    private subscribeToSourceEvents(): void {
        if (atoms == null) {
            return;
        }
        this.workspaceUpdateUnsub = waveEventSubscribe({
            eventType: "workspace:update",
            handler: () => {
                fireAndForget(() => this.refresh());
            },
        });
        this.globalWorkspaceUnsub = globalStore.sub(atoms.workspace, this.handleGlobalWorkspaceUpdate);
    }

    private handleGlobalWorkspaceUpdate(): void {
        if (atoms == null) {
            return;
        }
        const legacyWorkspace = globalStore.get(atoms.workspace) as LegacyWorkspace | null;
        if (legacyWorkspace == null) {
            return;
        }
        const nextActive = this.state.active;
        const merged = {
            ...nextActive,
            ...toWorkspaceSummary(legacyWorkspace),
            tabids: legacyWorkspace.tabids ? [...legacyWorkspace.tabids] : nextActive.tabids,
            pinnedtabids: legacyWorkspace.pinnedtabids ? [...legacyWorkspace.pinnedtabids] : nextActive.pinnedtabids,
            activetabid: legacyWorkspace.activetabid ?? nextActive.activetabid,
        };
        if (
            merged.oid === nextActive.oid &&
            merged.name === nextActive.name &&
            merged.icon === nextActive.icon &&
            merged.color === nextActive.color &&
            merged.activetabid === nextActive.activetabid &&
            merged.tabids.length === nextActive.tabids.length &&
            merged.pinnedtabids.length === nextActive.pinnedtabids.length &&
            merged.tabids.every((tabId, index) => tabId === nextActive.tabids[index]) &&
            merged.pinnedtabids.every((tabId, index) => tabId === nextActive.pinnedtabids[index])
        ) {
            return;
        }
        this.state = {
            ...this.state,
            active: merged,
        };
        this.notify();
    }

    private notify(): void {
        for (const listener of [...this.listeners]) {
            listener(this.state);
        }
    }

    private setState(nextActive: WorkspaceStoreSnapshot["active"]): void {
        this.state = {
            ...this.state,
            active: nextActive,
        };
        this.notify();
    }

    private setThemeState(colors: string[], icons: string[]): void {
        this.state = {
            ...this.state,
            colors,
            icons,
        };
        this.notify();
    }

    private setListState(list: WorkspaceListEntry[]): void {
        this.state = {
            ...this.state,
            list,
        };
        this.notify();
    }

    getSnapshot(): WorkspaceStoreSnapshot {
        return {
            active: { ...this.state.active },
            list: [...this.state.list],
            colors: [...this.state.colors],
            icons: [...this.state.icons],
        };
    }

    subscribe(listener: WorkspaceStoreListener): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => {
            this.listeners.delete(listener);
        };
    }

    private getActiveLegacyWorkspace(): LegacyWorkspace | null {
        return getLegacyWorkspaceFromAtoms();
    }

    async refresh(): Promise<void> {
        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }
        this.refreshPromise = (async () => {
            try {
                const facade = await getWorkspaceFacade();
                const apiWorkspace = await facade.getWorkspace();
                this.setState(adaptWorkspaceFromApi(apiWorkspace, this.getActiveLegacyWorkspace()));
            } catch (err) {
                console.warn("failed to refresh workspace from API", err);
            }
        })();
        await this.refreshPromise;
        this.refreshPromise = null;
    }

    async refreshWorkspaceList(): Promise<void> {
        if (this.listRefreshPromise) {
            await this.listRefreshPromise;
            return;
        }
        this.listRefreshPromise = (async () => {
            try {
                const workspaceEntries = await WorkspaceService.ListWorkspaces();
                const list: WorkspaceListEntry[] = [];
                for (const workspaceEntry of workspaceEntries ?? []) {
                    const { windowid, workspaceid } = workspaceEntry as { windowid: string; workspaceid: string };
                    const workspace = await WorkspaceService.GetWorkspace(workspaceid);
                    list.push(adaptWorkspaceListEntry(workspaceid, windowid, workspace));
                }
                this.setListState(list);
            } catch (err) {
                console.warn("failed to refresh workspace list", err);
            }
        })();
        await this.listRefreshPromise;
        this.listRefreshPromise = null;
    }

    async refreshThemes(): Promise<void> {
        if (this.themeRefreshPromise) {
            await this.themeRefreshPromise;
            return;
        }
        this.themeRefreshPromise = (async () => {
            const colors = await WorkspaceService.GetColors();
            const icons = await WorkspaceService.GetIcons();
            this.setThemeState(colors ?? [], icons ?? []);
            return { colors, icons };
        })();
        await this.themeRefreshPromise;
        this.themeRefreshPromise = null;
    }

    async getThemes(force = false): Promise<{ colors: string[]; icons: string[] }> {
        if (force || this.state.colors.length === 0 || this.state.icons.length === 0) {
            await this.refreshThemes();
        }
        return {
            colors: [...this.state.colors],
            icons: [...this.state.icons],
        };
    }

    async focusTab(tabId: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.focusTab({ tab_id: tabId });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
            return;
        }
        await this.refresh();
    }

    async createTerminalTab(): Promise<string> {
        const facade = await getWorkspaceFacade();
        const response = await facade.createTerminalTab();
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
        }
        await this.refreshWorkspaceList();
        return response?.widget_id;
    }

    async renameTab(tabId: string, title: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response: WorkspaceTabMutation = await facade.renameTab(tabId, { title });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
            return;
        }
        await this.refresh();
    }

    async setTabPinned(tabId: string, pinned: boolean): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response: WorkspaceTabMutation = await facade.setTabPinned(tabId, { pinned });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
            return;
        }
        await this.refresh();
    }

    async moveTab(tabId: string, beforeTabId: string | null | undefined): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.moveTab({ tab_id: tabId, before_tab_id: beforeTabId ?? "" });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
            return;
        }
        await this.refresh();
    }

    async closeTab(tabId: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.closeTab(tabId);
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.getActiveLegacyWorkspace()));
            return;
        }
        await this.refresh();
    }

    async switchWorkspace(workspaceId: string): Promise<void> {
        await getApi().switchWorkspace(workspaceId);
        await this.refresh();
    }

    async deleteWorkspace(workspaceId: string): Promise<void> {
        await WorkspaceService.DeleteWorkspace(workspaceId);
        await this.refreshWorkspaceList();
        await this.refresh();
    }

    async updateWorkspace(
        workspaceId: string,
        name: string,
        icon: string,
        color: string,
        applyDefaults: boolean
    ): Promise<void> {
        await WorkspaceService.UpdateWorkspace(workspaceId, name, icon, color, applyDefaults);
        await this.refreshWorkspaceList();
        await this.refresh();
    }

    async createWorkspace(): Promise<void> {
        await getApi().createWorkspace();
        await this.refreshWorkspaceList();
        await this.refresh();
    }
}

export const workspaceStore = new WorkspaceStore();
