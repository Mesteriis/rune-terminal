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
const AUTH_TOKEN = "playwright-last-tab-closure-token";

let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

interface WorkspaceSnapshot {
  tabs?: Array<{ id?: string; widget_ids?: string[] }>;
  active_tab_id?: string;
  widgets?: Array<{ id?: string; terminal_id?: string }>;
  active_widget_id?: string;
}

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

async function closeTab(page: Page, tabId: string): Promise<void> {
  const tab = page.locator(`[data-tab-id='${tabId}']`).first();
  await expect(tab).toBeVisible();
  await tab.hover();
  await tab.locator("button.close").click({ force: true });
}

test.describe.serial("last-tab closure parity", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-last-tab-closure-"));
    CORE_PORT = await allocatePort();
    FRONTEND_PORT = await allocatePort();
    FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/`;

    coreProcess = spawn(
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
        runtimeStateDir,
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

  test("closes the last tab into an explicit empty workspace and recovers through explicit add-tab flow", async ({ page, request }) => {
    await page.goto(FRONTEND_URL);
    await expect(page.getByTestId("workspace-tab-bar")).toBeVisible();
    await expect(page.locator("[data-tab-id='tab-main']")).toBeVisible();
    await expect(page.locator("[data-tab-id='tab-ops']")).toBeVisible();

    const initial = await getWorkspaceSnapshot(request);
    expect((initial.tabs ?? []).map((tab) => tab.id)).toEqual(["tab-main", "tab-ops"]);
    expect(initial.active_tab_id).toBe("tab-main");
    expect(initial.active_widget_id).toBe("term-main");

    await closeTab(page, "tab-ops");
    await expect(page.locator("[data-tab-id='tab-main']")).toBeVisible();
    await expect(page.locator("[data-tab-id='tab-ops']")).toHaveCount(0);

    const afterCloseOps = await getWorkspaceSnapshot(request);
    expect((afterCloseOps.tabs ?? []).map((tab) => tab.id)).toEqual(["tab-main"]);
    expect(afterCloseOps.active_tab_id).toBe("tab-main");
    expect(afterCloseOps.active_widget_id).toBe("term-main");

    await closeTab(page, "tab-main");
    await expect(page.getByText("No Active Tab")).toBeVisible();
    await expect(page.locator("[data-tab-id]")).toHaveCount(0);
    await expect(page.locator(".add-tab")).toBeVisible();

    const emptySnapshot = await getWorkspaceSnapshot(request);
    expect(emptySnapshot.tabs ?? []).toHaveLength(0);
    expect(emptySnapshot.widgets ?? []).toHaveLength(0);
    expect(emptySnapshot.active_tab_id).toBe("");
    expect(emptySnapshot.active_widget_id).toBe("");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("No Active Tab")).toBeVisible();
    await expect(page.locator("[data-tab-id]")).toHaveCount(0);

    const afterEmptyReload = await getWorkspaceSnapshot(request);
    expect(afterEmptyReload.tabs ?? []).toHaveLength(0);
    expect(afterEmptyReload.widgets ?? []).toHaveLength(0);
    expect(afterEmptyReload.active_tab_id).toBe("");
    expect(afterEmptyReload.active_widget_id).toBe("");

    await page.locator(".add-tab").click();
    const terminalPane = page.locator("[data-testid^='compat-widget-pane-']").first();
    await expect(terminalPane).toBeVisible();
    await expect(page.locator("[data-tab-id]")).toHaveCount(1);

    const recreated = await getWorkspaceSnapshot(request);
    expect(recreated.tabs ?? []).toHaveLength(1);
    expect(recreated.widgets ?? []).toHaveLength(1);
    expect(recreated.active_tab_id).not.toBe("");
    expect(recreated.active_widget_id).not.toBe("");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid^='compat-widget-pane-']").first()).toBeVisible();
    await expect(page.locator("[data-tab-id]")).toHaveCount(1);

    const recreatedAfterReload = await getWorkspaceSnapshot(request);
    expect(recreatedAfterReload.active_tab_id).toBe(recreated.active_tab_id);
    expect(recreatedAfterReload.active_widget_id).toBe(recreated.active_widget_id);
    expect((recreatedAfterReload.tabs ?? []).map((tab) => tab.id)).toEqual((recreated.tabs ?? []).map((tab) => tab.id));
  });
});
