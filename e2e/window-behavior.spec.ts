import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-window-behavior-token";
let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

type WindowLayoutNode = {
  kind?: string;
  widget_id?: string;
  axis?: string;
  first?: WindowLayoutNode;
  second?: WindowLayoutNode;
};

interface WorkspaceSnapshot {
  active_tab_id?: string;
  active_widget_id?: string;
  tabs?: Array<{
    id?: string;
    widget_ids?: string[];
    window_layout?: WindowLayoutNode;
  }>;
}

let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

function allocatePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address == null || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate TCP port"));
        return;
      }
      const port = address.port;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

function waitForOutput(
  process: ChildProcessWithoutNullStreams,
  matcher: RegExp,
  timeoutMs: number,
  processName: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${processName} did not emit expected output: ${matcher}`));
    }, timeoutMs);
    const onStdout = (chunk: Buffer) => {
      if (matcher.test(chunk.toString("utf8"))) {
        cleanup();
        resolve();
      }
    };
    const onStderr = (chunk: Buffer) => {
      if (matcher.test(chunk.toString("utf8"))) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(`${processName} exited before ready (code=${code})`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      process.stdout.off("data", onStdout);
      process.stderr.off("data", onStderr);
      process.off("exit", onExit);
    };
    process.stdout.on("data", onStdout);
    process.stderr.on("data", onStderr);
    process.on("exit", onExit);
  });
}

async function stopProcess(process: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (process == null || process.killed || process.exitCode != null) {
    return;
  }
  process.kill("SIGTERM");
  const done = once(process, "exit");
  await Promise.race([
    done,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (process.exitCode == null) {
          process.kill("SIGKILL");
        }
        resolve();
      }, 5_000);
    }),
  ]);
  if (process.exitCode != null) {
    return;
  }
  await Promise.race([
    once(process, "exit"),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5_000);
    }),
  ]);
}

function launchCore(stateDir: string): ChildProcessWithoutNullStreams {
  return spawn(
    "./scripts/go.sh",
    [
      "run",
      "./cmd/rterm-core",
      "serve",
      "--listen",
      `127.0.0.1:${CORE_PORT}`,
      "--workspace-root",
      REPO_ROOT,
      "--state-dir",
      stateDir,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        RTERM_AUTH_TOKEN: AUTH_TOKEN,
      },
      stdio: "pipe",
    },
  );
}

function findTab(snapshot: WorkspaceSnapshot, tabId: string): NonNullable<WorkspaceSnapshot["tabs"]>[number] {
  const tab = (snapshot.tabs ?? []).find((candidate) => candidate.id === tabId);
  expect(tab).toBeTruthy();
  return tab!;
}

async function getWorkspaceSnapshot(request: APIRequestContext): Promise<WorkspaceSnapshot> {
  const response = await request.get(`http://127.0.0.1:${CORE_PORT}/api/v1/workspace`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as WorkspaceSnapshot;
}

async function saveRemoteProfile(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.post(`http://127.0.0.1:${CORE_PORT}/api/v1/remote/profiles`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: {
      name,
      host: "example.com",
      user: "tester",
      port: 22,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    profile?: { id?: string };
    profiles?: Array<{ id?: string; name?: string }>;
  };
  const profileID =
    payload.profile?.id ??
    payload.profiles?.find((profile) => profile.name === name)?.id ??
    payload.profiles?.[0]?.id ??
    "";
  expect(profileID).not.toBe("");
  return profileID;
}

function assertSimpleSplitLayout(
  snapshot: WorkspaceSnapshot,
  tabId: string,
  sourceWidgetId: string,
  targetWidgetId: string,
  direction: "left" | "right" | "top" | "bottom",
): void {
  const tab = findTab(snapshot, tabId);
  const layout = tab.window_layout;
  expect(layout?.kind).toBe("split");
  const expectedAxis = direction === "left" || direction === "right" ? "horizontal" : "vertical";
  expect(layout?.axis).toBe(expectedAxis);
  if (direction === "left" || direction === "top") {
    expect(layout?.first?.widget_id).toBe(sourceWidgetId);
    expect(layout?.second?.widget_id).toBe(targetWidgetId);
    return;
  }
  expect(layout?.first?.widget_id).toBe(targetWidgetId);
  expect(layout?.second?.widget_id).toBe(sourceWidgetId);
}

function findWidgetPath(node: WindowLayoutNode | undefined, widgetId: string, path: Array<"first" | "second"> = []): Array<"first" | "second"> | null {
  if (node == null) {
    return null;
  }
  if (node.kind === "leaf") {
    return node.widget_id === widgetId ? path : null;
  }
  return (
    findWidgetPath(node.first, widgetId, [...path, "first"]) ??
    findWidgetPath(node.second, widgetId, [...path, "second"])
  );
}

async function listPaneWidgetIds(page: Page): Promise<string[]> {
  const panes = page.locator("[data-testid^='compat-widget-pane-']");
  const ids: string[] = [];
  const count = await panes.count();
  for (let i = 0; i < count; i += 1) {
    const testID = await panes.nth(i).getAttribute("data-testid");
    if (testID == null) {
      continue;
    }
    ids.push(testID.replace("compat-widget-pane-", ""));
  }
  return ids;
}

async function dragPaneToDirection(
  page: Page,
  sourceWidgetId: string,
  targetWidgetId: string,
  direction:
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "outer-left"
    | "outer-right"
    | "outer-top"
    | "outer-bottom"
    | "center",
): Promise<void> {
  const source = page.getByTestId(`compat-widget-pane-${sourceWidgetId}`);
  const target = page.getByTestId(`compat-widget-pane-${targetWidgetId}`);
  const targetBox = await target.boundingBox();
  expect(targetBox).toBeTruthy();
  const width = Math.max(targetBox!.width, 10);
  const height = Math.max(targetBox!.height, 10);
  const outerEdge = 4;
  let targetPosition = { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) };
  switch (direction) {
    case "left":
      targetPosition = { x: Math.floor(width * 0.3), y: Math.floor(height * 0.5) };
      break;
    case "right":
      targetPosition = { x: Math.floor(width * 0.7), y: Math.floor(height * 0.5) };
      break;
    case "top":
      targetPosition = { x: Math.floor(width * 0.5), y: Math.floor(height * 0.3) };
      break;
    case "bottom":
      targetPosition = { x: Math.floor(width * 0.5), y: Math.floor(height * 0.7) };
      break;
    case "outer-left":
      targetPosition = { x: outerEdge, y: Math.floor(height * 0.5) };
      break;
    case "outer-right":
      targetPosition = { x: Math.max(outerEdge, Math.floor(width - outerEdge)), y: Math.floor(height * 0.5) };
      break;
    case "outer-top":
      targetPosition = { x: Math.floor(width * 0.5), y: outerEdge };
      break;
    case "outer-bottom":
      targetPosition = { x: Math.floor(width * 0.5), y: Math.max(outerEdge, Math.floor(height - outerEdge)) };
      break;
    case "center":
      targetPosition = { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) };
      break;
    default:
      break;
  }
  const clientX = Math.floor(targetBox!.x + targetPosition.x);
  const clientY = Math.floor(targetBox!.y + targetPosition.y);
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer, clientX, clientY });
  await target.dispatchEvent("drop", { dataTransfer, clientX, clientY });
  await source.dispatchEvent("dragend", { dataTransfer });
  await dataTransfer.dispose();
}

async function openQuickActions(page: Page): Promise<void> {
  const surface = page.getByTestId("quick-actions-surface");
  if (await surface.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-quick-actions-button").click();
  await expect(surface).toBeVisible();
}

test.describe.serial("window behavior parity", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-window-behavior-"));
    CORE_PORT = await allocatePort();
    FRONTEND_PORT = await allocatePort();
    FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/`;

    coreProcess = launchCore(runtimeStateDir);
    await waitForOutput(coreProcess, new RegExp(`\"base_url\":\"http://127.0.0.1:${CORE_PORT}\"`), 60_000, "core runtime");

    frontendProcess = spawn(
      "npm",
      ["--prefix", "frontend", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(FRONTEND_PORT), "--strictPort"],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          VITE_RTERM_API_BASE: `http://127.0.0.1:${CORE_PORT}`,
          VITE_RTERM_AUTH_TOKEN: AUTH_TOKEN,
        },
        stdio: "pipe",
      },
    );
    await waitForOutput(frontendProcess, new RegExp(`Local:\\s+http://127.0.0.1:${FRONTEND_PORT}/`), 60_000, "frontend dev server");
  });

  test.afterAll(async () => {
    await stopProcess(frontendProcess);
    await stopProcess(coreProcess);
    if (runtimeStateDir !== "") {
      rmSync(runtimeStateDir, { recursive: true, force: true });
    }
  });

  test("splits on add, supports directional drop splits, keeps focus truth, and restores after reload", async ({ page, request }) => {
    await page.goto(FRONTEND_URL);
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();
    const remoteProfileID = await saveRemoteProfile(request, "E2E Remote Profile");

    const initial = await getWorkspaceSnapshot(request);
    const tabId = initial.active_tab_id ?? "tab-main";
    const tabBefore = findTab(initial, tabId);
    const widgetsBefore = tabBefore.widget_ids ?? [];
    expect(widgetsBefore.length).toBeGreaterThan(0);
    const originalWidgetId = widgetsBefore[0];

    const createSplitResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/split"),
    );
    await page.getByTestId(`compat-split-add-${originalWidgetId}`).click();
    const createSplitResponse = await createSplitResponsePromise;
    expect(createSplitResponse.ok()).toBeTruthy();

    const afterSplit = await getWorkspaceSnapshot(request);
    const tabAfterSplit = findTab(afterSplit, tabId);
    const widgetsAfterSplit = tabAfterSplit.widget_ids ?? [];
    expect(widgetsAfterSplit.length).toBe(widgetsBefore.length + 1);
    const splitWidgetId = widgetsAfterSplit.find((widgetId) => !widgetsBefore.includes(widgetId));
    expect(splitWidgetId).toBeTruthy();
    expect(afterSplit.active_widget_id).toBe(splitWidgetId);
    assertSimpleSplitLayout(afterSplit, tabId, splitWidgetId!, originalWidgetId, "right");
    await expect(page.getByTestId(`compat-widget-pane-${originalWidgetId}`)).toBeVisible();
    await expect(page.getByTestId(`compat-widget-pane-${splitWidgetId!}`)).toBeVisible();

    const focusWidgetResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/focus-widget"),
    );
    await page.getByTestId(`compat-widget-pane-${originalWidgetId}`).click();
    const focusWidgetResponse = await focusWidgetResponsePromise;
    expect(focusWidgetResponse.ok()).toBeTruthy();
    const afterFocus = await getWorkspaceSnapshot(request);
    expect(afterFocus.active_widget_id).toBe(originalWidgetId);

    const directions: Array<"left" | "right" | "top" | "bottom"> = ["left", "right", "top", "bottom"];
    for (const direction of directions) {
      const moveResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/workspace/widgets/move-split"),
      );
      await dragPaneToDirection(page, originalWidgetId, splitWidgetId!, direction);
      const moveResponse = await moveResponsePromise;
      expect(moveResponse.ok()).toBeTruthy();
      const snapshot = await getWorkspaceSnapshot(request);
      expect(snapshot.active_widget_id).toBe(originalWidgetId);
      assertSimpleSplitLayout(snapshot, tabId, originalWidgetId, splitWidgetId!, direction);
    }

    const beforeRestart = await getWorkspaceSnapshot(request);
    const beforeRestartTab = findTab(beforeRestart, tabId);

    await page.reload();
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();

    const afterReload = await getWorkspaceSnapshot(request);
    const afterReloadTab = findTab(afterReload, tabId);
    expect(afterReload.active_tab_id).toBe(beforeRestart.active_tab_id);
    expect(afterReload.active_widget_id).toBe(beforeRestart.active_widget_id);
    expect(afterReloadTab.window_layout).toEqual(beforeRestartTab.window_layout);

    await expect(page.getByTestId(`compat-widget-pane-${originalWidgetId}`)).toBeVisible();
    await expect(page.getByTestId(`compat-widget-pane-${splitWidgetId!}`)).toBeVisible();

    const paneIds = await listPaneWidgetIds(page);
    expect(paneIds).toContain(originalWidgetId);
    expect(paneIds).toContain(splitWidgetId!);

    await openQuickActions(page);
    await page.getByTestId("quick-action-item-ui.open_ai_panel").click();
    await expect(page.getByTestId("quick-actions-surface")).toBeHidden();
    await expect(page.locator("[data-waveai-panel='true']")).toBeVisible();

    await openQuickActions(page);
    await page.getByTestId("quick-action-item-ui.open_audit_panel").click();
    await expect(page.getByText("No audit events available")).toBeVisible();

    await openQuickActions(page);
    await page.getByTestId("quick-action-item-mcp.open_controls").click();
    await expect(page.getByText("MCP Servers")).toBeVisible();

    await openQuickActions(page);
    await expect(page.getByTestId("quick-actions-remote-profile-select")).toContainText("E2E Remote Profile");
    const startRemoteAction = page.getByTestId("quick-action-item-remote.start_profile_session");
    await expect(startRemoteAction).toBeEnabled();
    await expect(startRemoteAction).toContainText("remote_profile_id");
    expect(remoteProfileID).not.toBe("");
  });

  test("supports outer-zone drops and center-swap with focus/persistence truth", async ({ page, request }) => {
    test.setTimeout(120_000);

    await page.goto(FRONTEND_URL);
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();

    const createTabResponse = await request.post(`http://127.0.0.1:${CORE_PORT}/api/v1/workspace/tabs`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        title: "Parity Outer/Center",
      },
    });
    expect(createTabResponse.ok()).toBeTruthy();
    const createdTabPayload = (await createTabResponse.json()) as { tab_id?: string; widget_id?: string };
    const tabId = createdTabPayload.tab_id ?? "";
    const w1 = createdTabPayload.widget_id ?? "";
    expect(tabId).not.toBe("");
    expect(w1).not.toBe("");
    const focusTabResponse = await request.post(`http://127.0.0.1:${CORE_PORT}/api/v1/workspace/focus-tab`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        tab_id: tabId,
      },
    });
    expect(focusTabResponse.ok()).toBeTruthy();
    await page.reload();
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();
    await expect(page.getByTestId(`compat-widget-pane-${w1}`)).toBeVisible();

    const splitFrom = async (targetWidgetId: string, knownWidgetIds: string[]): Promise<string> => {
      const createSplitResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/workspace/widgets/split"),
      );
      await page.getByTestId(`compat-split-add-${targetWidgetId}`).click();
      const createSplitResponse = await createSplitResponsePromise;
      expect(createSplitResponse.ok()).toBeTruthy();
      const snapshot = await getWorkspaceSnapshot(request);
      const widgetIds = findTab(snapshot, tabId).widget_ids ?? [];
      const nextWidgetId = widgetIds.find((widgetId) => !knownWidgetIds.includes(widgetId));
      expect(nextWidgetId).toBeTruthy();
      return nextWidgetId!;
    };

    const w2 = await splitFrom(w1, [w1]);
    const w3 = await splitFrom(w1, [w1, w2]);
    const w4 = await splitFrom(w2, [w1, w2, w3]);

    let snapshot = await getWorkspaceSnapshot(request);
    expect(findTab(snapshot, tabId).window_layout?.kind).toBe("split");

    // Outer-left semantic check.
    let moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w3, w2, "outer-left");
    let moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("outer-left");
    snapshot = await getWorkspaceSnapshot(request);
    let layout = findTab(snapshot, tabId).window_layout;
    expect(layout?.second?.kind).toBe("split");
    expect(layout?.second?.axis).toBe("horizontal");
    expect(layout?.second?.first?.widget_id).toBe(w3);

    // Build vertical target branch (inner top), then verify outer-top semantic wrap.
    moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w4, w2, "top");
    moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("top");

    moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w1, w2, "outer-top");
    moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("outer-top");
    snapshot = await getWorkspaceSnapshot(request);
    layout = findTab(snapshot, tabId).window_layout;
    expect(layout?.second?.kind).toBe("split");
    expect(layout?.second?.axis).toBe("vertical");
    expect(layout?.second?.first?.widget_id).toBe(w1);
    expect(layout?.second?.second?.kind).toBe("split");

    // Center swap must exchange source/target paths.
    const pathW3Before = findWidgetPath(layout, w3);
    const pathW2Before = findWidgetPath(layout, w2);
    expect(pathW3Before).toBeTruthy();
    expect(pathW2Before).toBeTruthy();

    moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w3, w2, "center");
    moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("center");
    snapshot = await getWorkspaceSnapshot(request);
    layout = findTab(snapshot, tabId).window_layout;
    const pathW3After = findWidgetPath(layout, w3);
    const pathW2After = findWidgetPath(layout, w2);
    expect(pathW3After).toEqual(pathW2Before);
    expect(pathW2After).toEqual(pathW3Before);
    expect(snapshot.active_widget_id).toBe(w3);

    // Remaining outer directions are emitted explicitly from drop zones.
    moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w3, w2, "outer-right");
    moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("outer-right");

    moveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/widgets/move-split"),
    );
    await dragPaneToDirection(page, w3, w2, "outer-bottom");
    moveResponse = await moveResponsePromise;
    expect(moveResponse.ok()).toBeTruthy();
    expect((moveResponse.request().postDataJSON() as { direction?: string }).direction).toBe("outer-bottom");

    // Focus truth.
    const focusWidgetResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/focus-widget"),
    );
    await page.getByTestId(`compat-widget-pane-${w2}`).click();
    const focusWidgetResponse = await focusWidgetResponsePromise;
    expect(focusWidgetResponse.ok()).toBeTruthy();
    snapshot = await getWorkspaceSnapshot(request);
    expect(snapshot.active_widget_id).toBe(w2);

    // Persistence truth after outer/center actions.
    const beforeReload = await getWorkspaceSnapshot(request);
    const beforeReloadTab = findTab(beforeReload, tabId);
    await page.reload();
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();
    const afterReload = await getWorkspaceSnapshot(request);
    const afterReloadTab = findTab(afterReload, tabId);
    expect(afterReload.active_tab_id).toBe(beforeReload.active_tab_id);
    expect(afterReload.active_widget_id).toBe(beforeReload.active_widget_id);
    expect(afterReloadTab.window_layout).toEqual(beforeReloadTab.window_layout);
  });
});
