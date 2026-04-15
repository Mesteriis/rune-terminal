// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { App } from "@/app/app";
import { GlobalModel } from "@/app/store/global-model";
import {
    globalRefocus,
    registerBuilderGlobalKeys,
    registerControlShiftStateUpdateHandler,
    registerElectronReinjectKeyHandler,
    registerGlobalKeys,
} from "@/app/store/keymodel";
import { modalsModel } from "@/app/store/modalmodel";
import { workspaceStore } from "@/app/state/workspace.store";
import { RpcApi } from "@/app/store/wshclientapi";
import { makeBuilderRouteId, makeTabRouteId } from "@/app/store/wshrouter";
import { initCompatWshrpc, initWshrpc, TabRpcClient } from "@/app/store/wshrpcutil";
import { loadMonaco } from "@/app/view/codeeditor/codeeditor";
import { BuilderApp } from "@/builder/builder-app";
import { getLayoutModelForStaticTab } from "@/layout/index";
import {
    atoms,
    countersClear,
    countersPrint,
    getApi,
    globalStore,
    initGlobal,
    initGlobalWaveEventSubs,
    loadConnStatus,
    pushFlashError,
    pushNotification,
    removeNotificationById,
    subscribeToConnEvents,
} from "@/store/global";
import { activeTabIdAtom } from "@/store/tab-model";
import * as WOS from "@/store/wos";
import { logRuntimeValidation } from "@/runtime/debug";
import { loadFonts } from "@/util/fontutil";
import { setKeyUtilPlatform } from "@/util/keyutil";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

type WaveBootstrapWindow = Window & {
    api?: ElectronApi;
    WOS: typeof WOS;
    globalStore: typeof globalStore;
    globalAtoms: typeof atoms;
    RpcApi: typeof RpcApi;
    isFullScreen: boolean;
    countersPrint: typeof countersPrint;
    countersClear: typeof countersClear;
    getLayoutModelForStaticTab: typeof getLayoutModelForStaticTab;
    pushFlashError: typeof pushFlashError;
    pushNotification: typeof pushNotification;
    removeNotificationById: typeof removeNotificationById;
    modalsModel: typeof modalsModel;
    globalWS: ReturnType<typeof initWshrpc>;
    TabRpcClient: typeof TabRpcClient;
};

const bootstrapWindow = window as unknown as WaveBootstrapWindow;

function noopCleanup() {
    return () => {};
}

function resolveBrowserPlatform(): NodeJS.Platform {
    const navigatorWithUserAgentData = navigator as Navigator & {
        userAgentData?: {
            platform?: string;
        };
    };
    const rawPlatform = (
        navigatorWithUserAgentData.userAgentData?.platform ??
        navigator.platform ??
        ""
    ).toLowerCase();
    if (rawPlatform.includes("mac")) {
        return "darwin";
    }
    if (rawPlatform.includes("win")) {
        return "win32";
    }
    if (rawPlatform.includes("linux")) {
        return "linux";
    }
    return "linux";
}

function createBrowserElectronApi(): ElectronApi {
    return {
        getAuthKey: () => (import.meta.env.VITE_RTERM_AUTH_TOKEN as string | undefined) ?? "",
        getIsDev: () => Boolean(import.meta.env.DEV),
        getCursorPoint: () => ({ x: 0, y: 0 }),
        getPlatform: () => resolveBrowserPlatform(),
        getEnv: (varName: string) => ((import.meta.env as Record<string, string | undefined>)[varName] ?? ""),
        getUserName: () => "browser",
        getHostName: () => "localhost",
        getDataDir: () => "",
        getConfigDir: () => "",
        getHomeDir: () => "",
        getPathForFile: (file: File) => file.name,
        getWebviewPreload: () => "",
        getAboutModalDetails: () => ({ version: "browser-dev", buildTime: Date.now() }),
        getZoomFactor: () => window.devicePixelRatio || 1,
        showWorkspaceAppMenu: () => {},
        showBuilderAppMenu: () => {},
        showContextMenu: () => {},
        onContextMenuClick: () => {},
        onNavigate: () => {},
        onIframeNavigate: () => {},
        downloadFile: () => {},
        openExternal: (url: string) => {
            window.open(url, "_blank", "noopener,noreferrer");
        },
        onFullScreenChange: () => {},
        onZoomFactorChange: () => {},
        onUpdaterStatusChange: () => {},
        getUpdaterStatus: () => "up-to-date",
        getUpdaterChannel: () => "dev",
        installAppUpdate: () => {},
        onMenuItemAbout: () => {},
        onWindowTitleRename: noopCleanup,
        onWindowTitleRestoreAuto: noopCleanup,
        updateWindowControlsOverlay: () => {},
        onReinjectKey: () => {},
        setWebviewFocus: () => {},
        registerGlobalWebviewKeys: () => {},
        onControlShiftStateUpdate: () => {},
        createWorkspace: () => {},
        switchWorkspace: () => {},
        deleteWorkspace: () => {},
        setActiveTab: () => {},
        createTab: () => {},
        closeTab: () => {},
        setWindowInitStatus: (status) => {
            console.log("[browser-dev] window init status:", status);
        },
        onWaveInit: () => {},
        onBuilderInit: () => {},
        sendLog: (log: string) => {
            console.log("[browser-dev]", log);
        },
        onQuicklook: () => {},
        openNativePath: () => {},
        captureScreenshot: async () => "",
        setKeyboardChordMode: () => {},
        clearWebviewStorage: async () => {},
        setWaveAIOpen: () => {},
        closeBuilderWindow: () => {},
        incrementTermCommands: () => {},
        nativePaste: () => {},
        openBuilder: () => {},
        setBuilderWindowAppId: () => {},
        doRefresh: () => {
            window.location.reload();
        },
    };
}

function hasElectronPreloadApi(): boolean {
    return bootstrapWindow.api != null;
}

function ensureBootstrapApi(): ElectronApi {
    if (bootstrapWindow.api == null) {
        bootstrapWindow.api = createBrowserElectronApi();
    }
    return bootstrapWindow.api;
}

let platform: NodeJS.Platform = resolveBrowserPlatform();
if (bootstrapWindow.api != null) {
    platform = bootstrapWindow.api.getPlatform();
}
document.title = `TideTerm`;
let savedInitOpts: WaveInitOpts | null = null;

function describeError(error: unknown): string {
    return error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
}

bootstrapWindow.WOS = WOS;
bootstrapWindow.globalStore = globalStore;
bootstrapWindow.globalAtoms = atoms;
bootstrapWindow.RpcApi = RpcApi;
bootstrapWindow.isFullScreen = false;
bootstrapWindow.countersPrint = countersPrint;
bootstrapWindow.countersClear = countersClear;
bootstrapWindow.getLayoutModelForStaticTab = getLayoutModelForStaticTab;
bootstrapWindow.pushFlashError = pushFlashError;
bootstrapWindow.pushNotification = pushNotification;
bootstrapWindow.removeNotificationById = removeNotificationById;
bootstrapWindow.modalsModel = modalsModel;

function updateZoomFactor(zoomFactor: number) {
    console.log("update zoomfactor", zoomFactor);
    document.documentElement.style.setProperty("--zoomfactor", String(zoomFactor));
    document.documentElement.style.setProperty("--zoomfactor-inv", String(1 / zoomFactor));
}

function setDocumentVisible() {
    document.body.style.visibility = "";
    document.body.style.opacity = "";
    document.body.classList.remove("is-transparent");
}

async function initBrowserCompatApp(activeTabId: string, workspace: import("@/rterm-api/workspace/types").WorkspaceSnapshot) {
    const api = ensureBootstrapApi();
    const globalInitOpts: GlobalInitOptions = {
        tabId: activeTabId,
        clientId: "browser-client",
        windowId: "browser-window",
        platform,
        environment: "renderer",
    };

    initGlobal(globalInitOpts);
    bootstrapWindow.globalAtoms = atoms;
    bootstrapWindow.TabRpcClient = initCompatWshrpc(makeTabRouteId(activeTabId));
    globalStore.set(activeTabIdAtom, activeTabId);
    (globalStore as any).set(atoms.staticTabId, activeTabId);
    workspaceStore.hydrate(workspace);

    setKeyUtilPlatform(platform);
    updateZoomFactor(api.getZoomFactor());
    api.onZoomFactorChange((zoomFactor) => {
        updateZoomFactor(zoomFactor);
    });

    let firstRenderResolveFn: (() => void) | null = null;
    const firstRenderPromise = new Promise<void>((resolve) => {
        firstRenderResolveFn = resolve;
    });
    const reactElem = createElement(App, { onFirstRender: firstRenderResolveFn ?? (() => {}), compatMode: true }, null);
    const elem = document.getElementById("main");
    if (elem == null) {
        throw new Error("Could not find #main element");
    }
    const root = createRoot(elem);
    root.render(reactElem);
    await firstRenderPromise;
}

async function initBrowserCompatRuntime() {
    const api = ensureBootstrapApi();
    api.sendLog("Init Browser Compat Runtime");
    try {
        const [{ createCompatApiFacade }] = await Promise.all([import("@/compat")]);
        const facade = await createCompatApiFacade({
            noAuthForHealth: true,
        });
        const health = await facade.clients.bootstrap.getHealth();
        const bootstrap = await facade.clients.bootstrap.getBootstrap();
        const workspace = await facade.clients.workspace.getWorkspace();
        const terminalWidget =
            workspace.widgets.find((widget) => widget.id === workspace.active_widget_id && widget.kind === "terminal") ??
            workspace.widgets.find((widget) => widget.kind === "terminal");
        const terminalSnapshot =
            terminalWidget == null ? null : await facade.clients.terminal.getSnapshot(terminalWidget.id, 0);

        logRuntimeValidation({
            "runtime.source": facade.runtime.source,
            "runtime.baseUrl": facade.runtime.baseUrl,
            "runtime.authToken": facade.runtime.authToken ? "present" : "missing",
            "health.status": health.status,
            "bootstrap.product": bootstrap.product_name,
            "workspace.id": workspace.id,
            "workspace.active_tab_id": workspace.active_tab_id,
            "workspace.active_widget_id": workspace.active_widget_id,
            "terminal.widget_id": terminalWidget?.id ?? "none",
            "terminal.snapshot":
                terminalSnapshot == null
                    ? "skipped"
                    : `ok next_seq=${terminalSnapshot.next_seq} status=${terminalSnapshot.state.status}`,
        });
        await initBrowserCompatApp(workspace.active_tab_id, workspace);
        api.setWindowInitStatus("ready");
    } catch (e) {
        api.sendLog("Error in browser compat runtime " + describeError(e));
        console.error("Error in browser compat runtime", e);
        logRuntimeValidation({
            status: "error",
            error: describeError(e),
        });
    } finally {
        setDocumentVisible();
    }
}

async function initBare() {
    const hasNativePreloadApi = hasElectronPreloadApi();
    const api = hasNativePreloadApi ? bootstrapWindow.api! : ensureBootstrapApi();
    if (hasNativePreloadApi) {
        platform = api.getPlatform();
    }
    api.sendLog("Init Bare");
    document.body.style.visibility = "hidden";
    document.body.style.opacity = "0";
    document.body.classList.add("is-transparent");
    if (!hasNativePreloadApi) {
        await initBrowserCompatRuntime();
        return;
    }
    api.onWaveInit(initWaveWrap);
    api.onBuilderInit(initBuilderWrap);
    setKeyUtilPlatform(platform);
    loadFonts();
    updateZoomFactor(api.getZoomFactor());
    api.onZoomFactorChange((zoomFactor) => {
        updateZoomFactor(zoomFactor);
    });
    document.fonts.ready.then(() => {
        console.log("Init Bare Done");
        api.setWindowInitStatus("ready");
    });
}

document.addEventListener("DOMContentLoaded", initBare);

async function initWaveWrap(initOpts: WaveInitOpts) {
    try {
        if (savedInitOpts) {
            await reinitWave();
            return;
        }
        savedInitOpts = initOpts;
        await initWave(initOpts);
    } catch (e) {
        getApi().sendLog("Error in initWave " + describeError(e));
        console.error("Error in initWave", e);
    } finally {
        setDocumentVisible();
    }
}

async function reinitWave() {
    console.log("Reinit TideTerm");
    getApi().sendLog("Reinit TideTerm");

    // We use this hack to prevent a flicker of the previously-hovered tab when this view was last active.
    document.body.classList.add("nohover");
    requestAnimationFrame(() =>
        setTimeout(() => {
            document.body.classList.remove("nohover");
        }, 100)
    );

    if (savedInitOpts == null) {
        return;
    }

    await WOS.reloadWaveObject<Client>(WOS.makeORef("client", savedInitOpts.clientId));
    const waveWindow = await WOS.reloadWaveObject<WaveWindow>(WOS.makeORef("window", savedInitOpts.windowId));
    const ws = await WOS.reloadWaveObject<Workspace>(WOS.makeORef("workspace", waveWindow.workspaceid));
    const initialTab = await WOS.reloadWaveObject<Tab>(WOS.makeORef("tab", savedInitOpts.tabId));
    await WOS.reloadWaveObject<LayoutState>(WOS.makeORef("layout", initialTab.layoutstate));
    reloadAllWorkspaceTabs(ws);
            document.title = `TideTerm - ${initialTab.name}`; // TODO update with tab name change
    getApi().setWindowInitStatus("wave-ready");
    globalStore.set(atoms.reinitVersion, globalStore.get(atoms.reinitVersion) + 1);
    globalStore.set(atoms.updaterStatusAtom, getApi().getUpdaterStatus());
    setTimeout(() => {
        globalRefocus();
    }, 50);
}

function reloadAllWorkspaceTabs(ws: Workspace) {
    if (ws == null || (!ws.tabids?.length && !ws.pinnedtabids?.length)) {
        return;
    }
    ws.tabids?.forEach((tabid) => {
        WOS.reloadWaveObject<Tab>(WOS.makeORef("tab", tabid));
    });
    ws.pinnedtabids?.forEach((tabid) => {
        WOS.reloadWaveObject<Tab>(WOS.makeORef("tab", tabid));
    });
}

function loadAllWorkspaceTabs(ws: Workspace) {
    if (ws == null || (!ws.tabids?.length && !ws.pinnedtabids?.length)) {
        return;
    }
    ws.tabids?.forEach((tabid) => {
        WOS.getObjectValue<Tab>(WOS.makeORef("tab", tabid));
    });
    ws.pinnedtabids?.forEach((tabid) => {
        WOS.getObjectValue<Tab>(WOS.makeORef("tab", tabid));
    });
}

async function initWave(initOpts: WaveInitOpts) {
    getApi().sendLog("Init TideTerm " + JSON.stringify(initOpts));
    const globalInitOpts: GlobalInitOptions = {
        tabId: initOpts.tabId,
        clientId: initOpts.clientId,
        windowId: initOpts.windowId,
        platform,
        environment: "renderer",
        primaryTabStartup: initOpts.primaryTabStartup,
    };
    console.log("TideTerm Init", globalInitOpts);
    globalStore.set(activeTabIdAtom, initOpts.tabId);
    await GlobalModel.getInstance().initialize(globalInitOpts);
    initGlobal(globalInitOpts);
    bootstrapWindow.globalAtoms = atoms;

    // Init WPS event handlers
    const globalWS = initWshrpc(makeTabRouteId(initOpts.tabId));
    bootstrapWindow.globalWS = globalWS;
    bootstrapWindow.TabRpcClient = TabRpcClient;
    await loadConnStatus();
    initGlobalWaveEventSubs(initOpts);
    subscribeToConnEvents();

    // ensures client/window/workspace are loaded into the cache before rendering
    try {
        const [client, waveWindow, initialTab] = await Promise.all([
            WOS.loadAndPinWaveObject<Client>(WOS.makeORef("client", initOpts.clientId)),
            WOS.loadAndPinWaveObject<WaveWindow>(WOS.makeORef("window", initOpts.windowId)),
            WOS.loadAndPinWaveObject<Tab>(WOS.makeORef("tab", initOpts.tabId)),
        ]);
        const [ws] = await Promise.all([
            WOS.loadAndPinWaveObject<Workspace>(WOS.makeORef("workspace", waveWindow.workspaceid)),
            WOS.reloadWaveObject<LayoutState>(WOS.makeORef("layout", initialTab.layoutstate)),
        ]);
        void client;
        void waveWindow;
        void initialTab;
        loadAllWorkspaceTabs(ws);
        WOS.wpsSubscribeToObject(WOS.makeORef("workspace", waveWindow.workspaceid));
        document.title = `TideTerm - ${initialTab.name}`; // TODO update with tab name change
    } catch (e) {
        console.error("Failed initialization error", e);
        getApi().sendLog("Error in initialization (wave.ts, loading required objects) " + describeError(e));
    }
    registerGlobalKeys();
    registerElectronReinjectKeyHandler();
    registerControlShiftStateUpdateHandler();
    await loadMonaco();
    const fullConfig = await RpcApi.GetFullConfigCommand(TabRpcClient);
    console.log("fullconfig", fullConfig);
    globalStore.set(atoms.fullConfigAtom, fullConfig);
    const waveaiModeConfig = await RpcApi.GetWaveAIModeConfigCommand(TabRpcClient);
    globalStore.set(atoms.waveaiModeConfigAtom, waveaiModeConfig.configs);
    console.log("TideTerm First Render");
    let firstRenderResolveFn: (() => void) | null = null;
    const firstRenderPromise = new Promise<void>((resolve) => {
        firstRenderResolveFn = resolve;
    });
    const reactElem = createElement(App, { onFirstRender: firstRenderResolveFn ?? (() => {}) }, null);
    const elem = document.getElementById("main");
    if (elem == null) {
        throw new Error("Could not find #main element");
    }
    const root = createRoot(elem);
    root.render(reactElem);
    await firstRenderPromise;
    console.log("TideTerm First Render Done");
    getApi().setWindowInitStatus("wave-ready");
}

async function initBuilderWrap(initOpts: BuilderInitOpts) {
    try {
        await initBuilder(initOpts);
    } catch (e) {
        getApi().sendLog("Error in initBuilder " + describeError(e));
        console.error("Error in initBuilder", e);
    } finally {
        setDocumentVisible();
    }
}

async function initBuilder(initOpts: BuilderInitOpts) {
    getApi().sendLog("Init Builder " + JSON.stringify(initOpts));
    const globalInitOpts: GlobalInitOptions = {
        clientId: initOpts.clientId,
        windowId: initOpts.windowId,
        platform,
        environment: "renderer",
        builderId: initOpts.builderId,
    };
    console.log("Tsunami Builder Init", globalInitOpts);
    await GlobalModel.getInstance().initialize(globalInitOpts);
    initGlobal(globalInitOpts);
    bootstrapWindow.globalAtoms = atoms;

    const globalWS = initWshrpc(makeBuilderRouteId(initOpts.builderId));
    bootstrapWindow.globalWS = globalWS;
    bootstrapWindow.TabRpcClient = TabRpcClient;
    await loadConnStatus();

    let appIdToUse: string | null = null;
    try {
        const oref = WOS.makeORef("builder", initOpts.builderId);
        const rtInfo = await RpcApi.GetRTInfoCommand(TabRpcClient, { oref });
        if (rtInfo && rtInfo["builder:appid"]) {
            appIdToUse = rtInfo["builder:appid"];
        }
    } catch (e) {
        console.log("Could not load saved builder appId from rtinfo:", e);
    }

    document.title = appIdToUse ? `WaveApp Builder (${appIdToUse})` : "WaveApp Builder";

    globalStore.set(atoms.builderAppId, appIdToUse ?? "");

    await WOS.loadAndPinWaveObject<Client>(WOS.makeORef("client", initOpts.clientId));

    registerBuilderGlobalKeys();
    registerElectronReinjectKeyHandler();
    await loadMonaco();
    const fullConfig = await RpcApi.GetFullConfigCommand(TabRpcClient);
    console.log("fullconfig", fullConfig);
    globalStore.set(atoms.fullConfigAtom, fullConfig);
    const waveaiModeConfig = await RpcApi.GetWaveAIModeConfigCommand(TabRpcClient);
    globalStore.set(atoms.waveaiModeConfigAtom, waveaiModeConfig.configs);

    console.log("Tsunami Builder First Render");
    let firstRenderResolveFn: (() => void) | null = null;
    const firstRenderPromise = new Promise<void>((resolve) => {
        firstRenderResolveFn = resolve;
    });
    const reactElem = createElement(BuilderApp, { initOpts, onFirstRender: firstRenderResolveFn ?? (() => {}) }, null);
    const elem = document.getElementById("main");
    if (elem == null) {
        throw new Error("Could not find #main element");
    }
    const root = createRoot(elem);
    root.render(reactElem);
    await firstRenderPromise;
    console.log("Tsunami Builder First Render Done");
}
