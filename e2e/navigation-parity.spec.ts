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
const AUTH_TOKEN = "playwright-navigation-parity-token";

let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

type ActiveWorkspaceSnapshot = {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
};

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

async function getActiveWorkspace(request: APIRequestContext): Promise<ActiveWorkspaceSnapshot> {
  const response = await request.get(`http://127.0.0.1:${CORE_PORT}/api/v1/workspace`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ActiveWorkspaceSnapshot;
}

async function openWorkspaceSwitcher(page: Page): Promise<void> {
  const switcher = page.getByTestId("workspace-switcher-surface");
  if (await switcher.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-switcher-button").click();
  await expect(switcher).toBeVisible();
}

async function openLauncher(page: Page): Promise<void> {
  const surface = page.getByTestId("quick-actions-surface");
  if (await surface.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-quick-actions-button").click();
  await expect(surface).toBeVisible();
}

function expectBoxWithinViewport(
  box: { x: number; y: number; width: number; height: number } | null,
  viewport: { width: number; height: number },
): void {
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

test.describe.serial("navigation parity", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-navigation-parity-"));
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

  test("workspace switcher saves the current workspace, creates a new one, and switches back explicitly", async ({ page, request }) => {
    await page.goto(FRONTEND_URL);
    await openWorkspaceSwitcher(page);

    await expect(page.locator(".workspace-switcher-content .title")).toHaveText("Open workspace");
    await expect(page.locator(".workspace-switcher-content .actions")).toContainText("Save workspace");

    await page.getByText("Save workspace").click();
    const savedRow = page.locator(".workspace-switcher-content .menu-group-title-wrapper .label").filter({ hasText: "Local Workspace" });
    await expect(savedRow).toHaveCount(1);
    await expect(page.locator(".workspace-switcher-content .actions")).toContainText("Create new workspace");

    const savedWorkspace = await getActiveWorkspace(request);
    expect(savedWorkspace.name).toBe("Local Workspace");
    expect(savedWorkspace.icon).toBeTruthy();
    expect(savedWorkspace.color).toBeTruthy();

    await page.getByText("Create new workspace").click();
    await page.waitForTimeout(600);
    await openWorkspaceSwitcher(page);
    await expect(page.locator(".workspace-switcher-content .title")).toHaveText("Open workspace");
    await expect(savedRow).toHaveCount(1);

    const unsavedWorkspace = await getActiveWorkspace(request);
    expect(unsavedWorkspace.id).not.toBe(savedWorkspace.id);
    expect(unsavedWorkspace.icon ?? "").toBe("");

    await savedRow.click();
    await expect.poll(async () => (await getActiveWorkspace(request)).id).toBe(savedWorkspace.id);
    await openWorkspaceSwitcher(page);
    await expect(page.locator(".workspace-switcher-content .title")).toHaveText("Switch workspace");
  });

  test("launcher remains discoverable and utility overlays stay bounded and non-stacked", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    await expect(page.getByTestId("workspace-quick-actions-button")).toContainText("Launch");
    await openLauncher(page);
    await expect(page.getByTestId("quick-actions-surface")).toContainText("Launcher");
    await expect(page.getByTestId("quick-actions-filter")).toHaveAttribute("placeholder", "Search launcher");

    const launcherBox = await page.getByTestId("quick-actions-surface").boundingBox();
    expectBoxWithinViewport(launcherBox, viewport!);

    await page.getByTestId("quick-actions-filter").fill("files");
    await page.getByTestId("quick-action-item-ui.open_files_panel").click();
    const filesPanelAction = page.getByRole("button", { name: "Attach Selected File To AI Context" });
    await expect(filesPanelAction).toBeVisible();
    await expect(page.getByTestId("quick-actions-surface")).toBeHidden();
    const filesBox = await filesPanelAction.locator("xpath=ancestor::div[contains(@class,'shadow-xl')][1]").boundingBox();
    expectBoxWithinViewport(filesBox, viewport!);

    await page.getByTestId("workspace-tools-button").click();
    await expect(page.getByText("MCP Servers")).toBeVisible();
    await expect(filesPanelAction).toBeHidden();

    await page.getByTestId("workspace-audit-button").click();
    await expect(page.getByText("Audit").last()).toBeVisible();
    await expect(page.getByText("MCP Servers")).toBeHidden();

    await openWorkspaceSwitcher(page);
    const switcherBox = await page.getByTestId("workspace-switcher-surface").boundingBox();
    expectBoxWithinViewport(switcherBox, viewport!);
    expect(switcherBox!.x).toBeLessThan(400);
    expect(switcherBox!.y).toBeLessThan(160);

    const layoutHeights = await page.evaluate(() => {
      const button = document.querySelector("[data-testid='workspace-quick-actions-button']");
      const rail = button?.parentElement;
      const row = rail?.parentElement;
      return {
        railHeight: Math.round(rail?.getBoundingClientRect().height ?? 0),
        rowHeight: Math.round(row?.getBoundingClientRect().height ?? 0),
      };
    });
    expect(layoutHeights.railHeight).toBeGreaterThan(0);
    expect(layoutHeights.railHeight).toBe(layoutHeights.rowHeight);
  });
});
