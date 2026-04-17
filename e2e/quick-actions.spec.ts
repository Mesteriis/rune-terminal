import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-quick-actions-token";
const CORE_PORT = 61242;
const FRONTEND_PORT = 4194;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/`;

let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

interface WorkspaceSnapshot {
  active_widget_id?: string;
  tabs?: Array<{ id?: string }>;
  widgets?: Array<{ id?: string; connection_id?: string }>;
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
      const text = chunk.toString("utf8");
      if (matcher.test(text)) {
        cleanup();
        resolve();
      }
    };
    const onStderr = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      if (matcher.test(text)) {
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
        if (!process.killed && process.exitCode == null) {
          process.kill("SIGKILL");
        }
        resolve();
      }, 5_000);
    }),
  ]);
}

async function openQuickActions(page: Page): Promise<void> {
  const surface = page.getByTestId("quick-actions-surface");
  if (await surface.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-quick-actions-button").click();
  await expect(surface).toBeVisible();
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

function getActiveConnectionID(snapshot: WorkspaceSnapshot): string {
  const activeWidgetID = snapshot.active_widget_id ?? "";
  const activeWidget = (snapshot.widgets ?? []).find((widget) => widget.id === activeWidgetID);
  return activeWidget?.connection_id ?? "";
}

test.describe.serial("quick actions workflow", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-quick-actions-"));

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

  test("opens, routes actions, and preserves explicit local-vs-remote context", async ({ page, request }) => {
    await page.goto(FRONTEND_URL);
    await openQuickActions(page);

    const quickActionsSurface = page.getByTestId("quick-actions-surface");
    await expect(quickActionsSurface).toContainText("Quick Actions");
    await expect(page.getByTestId("quick-action-item-ui.open_files_panel")).toBeVisible();
    await expect(page.getByTestId("quick-action-item-workspace.create_local_terminal_tab")).toBeVisible();

    const workspaceBefore = await getWorkspaceSnapshot(request);
    const createTabResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/api/v1/workspace/tabs"),
    );
    await page.getByTestId("quick-action-item-workspace.create_local_terminal_tab").click();
    const createTabResponse = await createTabResponsePromise;
    expect(createTabResponse.ok()).toBeTruthy();

    const workspaceAfter = await getWorkspaceSnapshot(request);
    expect((workspaceAfter.tabs ?? []).length).toBe((workspaceBefore.tabs ?? []).length + 1);
    expect(getActiveConnectionID(workspaceAfter)).toBe("local");

    await openQuickActions(page);
    await page.getByTestId("quick-action-item-ui.open_files_panel").click();
    await expect(page.getByRole("button", { name: "Attach Selected File To AI Context" })).toBeVisible();

    await page.getByRole("button", { name: /README\.md/i }).first().click();

    await openQuickActions(page);
    await expect(quickActionsSurface).toContainText("selected file:");
    await expect(quickActionsSurface).toContainText("README.md");
    await expect(quickActionsSurface).toContainText("(local:local)");

    const remoteRunPromptAction = page.getByTestId("quick-action-item-files.use_selected_path_in_remote_run_prompt");
    await expect(remoteRunPromptAction).toBeDisabled();
    await expect(remoteRunPromptAction).toContainText("Requires active remote terminal target.");

    await page.getByTestId("quick-action-item-mcp.open_controls").click();
    await expect(page.getByText("MCP Servers")).toBeVisible();
  });
});
