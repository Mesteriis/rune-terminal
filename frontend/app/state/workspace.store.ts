import type {
    WorkspaceLayout,
    WorkspaceLayoutSurface,
    WorkspaceTabMutation,
    WorkspaceSnapshot,
    WorkspaceTab,
    WorkspaceWindowLayoutNode,
} from "@/rterm-api/workspace/types";
import { atoms, getApi, globalStore } from "@/store/global";
import { WorkspaceService } from "@/app/store/services";
import { waveEventSubscribe } from "@/app/store/wps";
import { getWorkspaceFacade } from "@/compat/workspace";
import { fireAndForget } from "@/util/util";
type LegacyWorkspace = Workspace;
type WorkspaceFallback = Pick<WorkspaceSummary, "oid" | "name" | "icon" | "color"> & { activetabid?: string };

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

export interface WorkspaceStoreTab {
    id: string;
    title: string;
    description?: string;
    pinned: boolean;
    widgetIds: string[];
    windowLayout?: WorkspaceStoreWindowLayoutNode;
}

export interface WorkspaceStoreWidget {
    id: string;
    kind: string;
    title: string;
    description?: string;
    terminalId?: string;
    connectionId?: string;
}

export interface WorkspaceStoreLayoutSurface {
    id: string;
    region: string;
}

export interface WorkspaceStoreLayout {
    id: string;
    mode: string;
    surfaces: WorkspaceStoreLayoutSurface[];
    activeSurfaceId: string;
}

export interface WorkspaceStoreWindowLayoutNode {
    kind: string;
    widgetId?: string;
    axis?: string;
    first?: WorkspaceStoreWindowLayoutNode;
    second?: WorkspaceStoreWindowLayoutNode;
}

export interface WorkspaceStoreSnapshot {
    active: WorkspaceSummary & {
        tabids: string[];
        pinnedtabids: string[];
        activetabid: string;
        activewidgetid: string;
        tabs: Record<string, WorkspaceStoreTab>;
        widgets: Record<string, WorkspaceStoreWidget>;
        layout: WorkspaceStoreLayout;
        layouts: WorkspaceStoreLayout[];
        activeLayoutId: string;
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

const defaultWorkspaceLayout: WorkspaceStoreLayout = {
    id: "layout-default",
    mode: "split",
    surfaces: [
        { id: "terminal", region: "main" },
        { id: "ai", region: "sidebar" },
        { id: "tools", region: "utility" },
        { id: "audit", region: "utility" },
        { id: "mcp", region: "utility" },
    ],
    activeSurfaceId: "terminal",
};

function normalizeLayoutSurfaces(surfaces: WorkspaceLayoutSurface[] | undefined): WorkspaceStoreLayoutSurface[] {
    if (!Array.isArray(surfaces) || surfaces.length === 0) {
        return defaultWorkspaceLayout.surfaces.map((surface) => ({ ...surface }));
    }
    const seen = new Set<string>();
    const next: WorkspaceStoreLayoutSurface[] = [];
    for (const surface of surfaces) {
        const id = (surface?.id ?? "").trim();
        const region = (surface?.region ?? "").trim();
        if (id === "" || region === "" || seen.has(id)) {
            continue;
        }
        seen.add(id);
        next.push({ id, region });
    }
    if (next.length === 0) {
        return defaultWorkspaceLayout.surfaces.map((surface) => ({ ...surface }));
    }
    return next;
}

function adaptLayoutFromApi(layout: WorkspaceLayout | undefined): WorkspaceStoreLayout {
    const fallback = defaultWorkspaceLayout;
    const normalizedSurfaces = normalizeLayoutSurfaces(layout?.surfaces);
    const id = (layout?.id ?? "").trim() || fallback.id;
    const mode = (layout?.mode ?? "").trim() || fallback.mode;
    const activeSurfaceIdRaw = (layout?.active_surface_id ?? "").trim();
    const activeSurfaceId = normalizedSurfaces.some((surface) => surface.id === activeSurfaceIdRaw)
        ? activeSurfaceIdRaw
        : normalizedSurfaces[0]?.id ?? fallback.activeSurfaceId;
    return {
        id,
        mode,
        surfaces: normalizedSurfaces,
        activeSurfaceId,
    };
}

function adaptLayoutsFromApi(layouts: WorkspaceLayout[] | undefined, fallbackActive: WorkspaceStoreLayout): WorkspaceStoreLayout[] {
    if (!Array.isArray(layouts) || layouts.length === 0) {
        return [fallbackActive];
    }
    const next: WorkspaceStoreLayout[] = [];
    const seen = new Set<string>();
    for (const layout of layouts) {
        const normalized = adaptLayoutFromApi(layout);
        if (seen.has(normalized.id)) {
            continue;
        }
        seen.add(normalized.id);
        next.push(normalized);
    }
    if (!seen.has(fallbackActive.id)) {
        next.push(fallbackActive);
    }
    return next;
}

function toApiLayout(layout: WorkspaceStoreLayout): WorkspaceLayout {
    return {
        id: layout.id,
        mode: layout.mode,
        surfaces: layout.surfaces.map((surface) => ({
            id: surface.id,
            region: surface.region,
        })),
        active_surface_id: layout.activeSurfaceId,
    };
}

function adaptWindowLayoutFromApi(node: WorkspaceWindowLayoutNode | undefined): WorkspaceStoreWindowLayoutNode | undefined {
    if (node == null || typeof node !== "object") {
        return undefined;
    }
    const kind = (node.kind ?? "").trim();
    if (kind === "") {
        return undefined;
    }
    const adapted: WorkspaceStoreWindowLayoutNode = {
        kind,
        widgetId: node.widget_id?.trim() || undefined,
        axis: node.axis?.trim() || undefined,
    };
    const first = adaptWindowLayoutFromApi(node.first);
    const second = adaptWindowLayoutFromApi(node.second);
    if (first != null) {
        adapted.first = first;
    }
    if (second != null) {
        adapted.second = second;
    }
    return adapted;
}

function cloneWindowLayoutNode(node: WorkspaceStoreWindowLayoutNode | undefined): WorkspaceStoreWindowLayoutNode | undefined {
    if (node == null) {
        return undefined;
    }
    return {
        kind: node.kind,
        widgetId: node.widgetId,
        axis: node.axis,
        first: cloneWindowLayoutNode(node.first),
        second: cloneWindowLayoutNode(node.second),
    };
}

function adaptWorkspaceFromApi(apiWorkspace: ApiWorkspace, fallback?: WorkspaceFallback | null): WorkspaceStoreSnapshot["active"] {
    const legacyWorkspace = fallback ?? null;
    const tabs: WorkspaceTab[] = apiWorkspace?.tabs ?? [];
    const widgets = apiWorkspace?.widgets ?? [];
    const pinnedtabids = tabs.filter((tab) => tab.pinned).map((tab) => tab.id);
    const tabids = tabs.filter((tab) => !tab.pinned).map((tab) => tab.id);
    const tabsById = Object.fromEntries(
        tabs.map((tab) => [
            tab.id,
            {
                id: tab.id,
                title: tab.title ?? "",
                description: tab.description,
                pinned: tab.pinned,
                widgetIds: [...(tab.widget_ids ?? [])],
                windowLayout: adaptWindowLayoutFromApi(tab.window_layout),
            } satisfies WorkspaceStoreTab,
        ])
    );
    const widgetsById = Object.fromEntries(
        widgets.map((widget) => [
            widget.id,
            {
                id: widget.id,
                kind: widget.kind,
                title: widget.title ?? "",
                description: widget.description,
                terminalId: widget.terminal_id,
                connectionId: widget.connection_id,
            } satisfies WorkspaceStoreWidget,
        ])
    );
    const activeLayout = adaptLayoutFromApi(apiWorkspace?.layout);
    const layouts = adaptLayoutsFromApi(apiWorkspace?.layouts, activeLayout);
    const activeLayoutIDRaw = (apiWorkspace?.active_layout_id ?? "").trim();
    const activeLayoutID = layouts.some((layout) => layout.id === activeLayoutIDRaw) ? activeLayoutIDRaw : activeLayout.id;
    return {
        oid: apiWorkspace?.id ?? legacyWorkspace?.oid ?? "",
        name: apiWorkspace?.name ?? legacyWorkspace?.name ?? "",
        icon: legacyWorkspace?.icon ?? "",
        color: legacyWorkspace?.color ?? "",
        tabids,
        pinnedtabids,
        activetabid: apiWorkspace?.active_tab_id ?? legacyWorkspace?.activetabid ?? "",
        activewidgetid: apiWorkspace?.active_widget_id ?? "",
        layout: activeLayout,
        layouts,
        activeLayoutId: activeLayoutID,
        tabs: tabsById,
        widgets: widgetsById,
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
    private compatModeActive = true;

    constructor() {
        const initialWorkspace = getLegacyWorkspaceFromAtoms();
        this.state = {
            active: {
                ...defaultWorkspaceSummary,
                ...toWorkspaceSummary(initialWorkspace),
                tabids: Array.isArray(initialWorkspace?.tabids) ? [...initialWorkspace.tabids] : [],
                pinnedtabids: Array.isArray(initialWorkspace?.pinnedtabids) ? [...initialWorkspace.pinnedtabids] : [],
                activetabid: initialWorkspace?.activetabid ?? "",
                activewidgetid: "",
                layout: { ...defaultWorkspaceLayout, surfaces: [...defaultWorkspaceLayout.surfaces] },
                layouts: [{ ...defaultWorkspaceLayout, surfaces: [...defaultWorkspaceLayout.surfaces] }],
                activeLayoutId: defaultWorkspaceLayout.id,
                tabs: {},
                widgets: {},
            },
            list: [],
            colors: [],
            icons: [],
        };

        this.handleGlobalWorkspaceUpdate = this.handleGlobalWorkspaceUpdate.bind(this);
    }

    private subscribeToSourceEvents(): void {
        if (atoms == null || this.workspaceUpdateUnsub != null || this.globalWorkspaceUnsub != null) {
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

    private unsubscribeFromSourceEvents(): void {
        if (this.workspaceUpdateUnsub != null) {
            this.workspaceUpdateUnsub();
            this.workspaceUpdateUnsub = null;
        }
        if (this.globalWorkspaceUnsub != null) {
            this.globalWorkspaceUnsub();
            this.globalWorkspaceUnsub = null;
        }
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
                layout: nextActive.layout,
                layouts: nextActive.layouts,
                activeLayoutId: nextActive.activeLayoutId,
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
        if (atoms?.staticTabId != null && nextActive.activetabid) {
            (globalStore as any).set(atoms.staticTabId, nextActive.activetabid);
        }
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
            active: {
                ...this.state.active,
                tabs: Object.fromEntries(
                    Object.entries(this.state.active.tabs).map(([tabID, tab]) => [
                        tabID,
                        {
                            ...tab,
                            widgetIds: [...tab.widgetIds],
                            windowLayout: cloneWindowLayoutNode(tab.windowLayout),
                        },
                    ])
                ),
                widgets: { ...this.state.active.widgets },
                layout: {
                    ...this.state.active.layout,
                    surfaces: [...this.state.active.layout.surfaces],
                },
                layouts: this.state.active.layouts.map((layout) => ({
                    ...layout,
                    surfaces: [...layout.surfaces],
                })),
                activeLayoutId: this.state.active.activeLayoutId,
            },
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

    setCompatMode(active: boolean): void {
        this.compatModeActive = active;
        if (active) {
            this.unsubscribeFromSourceEvents();
            return;
        }
        this.subscribeToSourceEvents();
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
                this.setState(adaptWorkspaceFromApi(apiWorkspace, this.state.active));
            } catch (err) {
                console.warn("failed to refresh workspace from API", err);
            }
        })();
        await this.refreshPromise;
        this.refreshPromise = null;
    }

    hydrate(apiWorkspace: ApiWorkspace): void {
        this.setState(adaptWorkspaceFromApi(apiWorkspace, this.state.active));
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
            try {
                const colors = await WorkspaceService.GetColors();
                const icons = await WorkspaceService.GetIcons();
                this.setThemeState(colors ?? [], icons ?? []);
                return { colors, icons };
            } catch (err) {
                console.warn("failed to refresh workspace themes", err);
                this.setThemeState([], []);
                return { colors: [], icons: [] };
            }
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
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async focusWidget(widgetId: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.focusWidget({ widget_id: widgetId });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async createTerminalTab(connectionId?: string): Promise<string> {
        const facade = await getWorkspaceFacade();
        const response = await facade.createTerminalTab({
            connection_id: connectionId,
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
        }
        if (!this.compatModeActive) {
            await this.refreshWorkspaceList();
        }
        return response?.widget_id;
    }

    async createSplitTerminalWidget(
        tabId?: string,
        targetWidgetId?: string,
        direction: "left" | "right" | "top" | "bottom" = "right",
        connectionId?: string
    ): Promise<string> {
        const facade = await getWorkspaceFacade();
        const response = await facade.createSplitTerminalWidget({
            tab_id: tabId,
            target_widget_id: targetWidgetId,
            direction,
            connection_id: connectionId,
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
        } else {
            await this.refresh();
        }
        return response?.widget_id;
    }

    async createRemoteTerminalTab(connectionId?: string): Promise<string> {
        const facade = await getWorkspaceFacade();
        const response = await facade.createRemoteTerminalTab({
            connection_id: connectionId,
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
        }
        if (!this.compatModeActive) {
            await this.refreshWorkspaceList();
        }
        return response?.widget_id;
    }

    async renameTab(tabId: string, title: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response: WorkspaceTabMutation = await facade.renameTab(tabId, { title });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async setTabPinned(tabId: string, pinned: boolean): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response: WorkspaceTabMutation = await facade.setTabPinned(tabId, { pinned });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async moveTab(tabId: string, beforeTabId: string | null | undefined): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.moveTab({ tab_id: tabId, before_tab_id: beforeTabId ?? "" });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async closeTab(tabId: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.closeTab(tabId);
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async updateLayout(layout: WorkspaceStoreLayout): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.updateLayout({
            layout: toApiLayout(layout),
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async saveLayout(layoutID?: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.saveLayout({
            layout_id: layoutID,
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
            return;
        }
        await this.refresh();
    }

    async switchLayout(layoutID: string): Promise<void> {
        const facade = await getWorkspaceFacade();
        const response = await facade.switchLayout({
            layout_id: layoutID,
        });
        if (response?.workspace) {
            this.setState(adaptWorkspaceFromApi(response.workspace, this.state.active));
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
