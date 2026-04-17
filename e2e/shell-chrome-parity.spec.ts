import { expect, test, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-shell-chrome-parity-token";

let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

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

async function openSettings(page: Page): Promise<void> {
  const surface = page.getByTestId("settings-surface");
  if (await surface.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-settings-button").click();
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

test.describe.serial("shell chrome parity", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-shell-chrome-"));
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

  test("renders compact top chrome with Tide-like header hierarchy and bounded shell surfaces", async ({ page }) => {
    await page.goto(FRONTEND_URL);

    const chromeMetrics = await page.evaluate(() => {
      const topBar = document.querySelector<HTMLElement>("[data-testid='workspace-tab-bar']");
      const aiButton = document.querySelector<HTMLElement>("[data-testid='workspace-ai-toggle-button']");
      const switcherButton = document.querySelector<HTMLElement>("[data-testid='workspace-switcher-button']");
      const tabStrip = document.querySelector<HTMLElement>("[data-testid='workspace-tab-strip']");
      const quickActionsButton = document.querySelector<HTMLElement>("[data-testid='workspace-quick-actions-button']");
      const settingsButton = document.querySelector<HTMLElement>("[data-testid='workspace-settings-button']");

      if (
        topBar == null ||
        aiButton == null ||
        switcherButton == null ||
        tabStrip == null ||
        quickActionsButton == null ||
        settingsButton == null
      ) {
        return null;
      }

      const toBox = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      return {
        topBar: toBox(topBar),
        aiButton: toBox(aiButton),
        switcherButton: toBox(switcherButton),
        tabStrip: toBox(tabStrip),
        quickActionsButton: toBox(quickActionsButton),
        settingsButton: toBox(settingsButton),
        addRemoteCount: document.querySelectorAll(".add-remote-tab, .add-remote-profiles").length,
      };
    });

    expect(chromeMetrics).not.toBeNull();
    expect(chromeMetrics!.topBar.height).toBeGreaterThanOrEqual(32);
    expect(chromeMetrics!.topBar.height).toBeLessThanOrEqual(36);
    expect(chromeMetrics!.aiButton.x).toBeLessThan(chromeMetrics!.switcherButton.x);
    expect(chromeMetrics!.switcherButton.x + chromeMetrics!.switcherButton.width).toBeLessThan(
      chromeMetrics!.tabStrip.x + 2,
    );
    expect(chromeMetrics!.tabStrip.width).toBeGreaterThan(chromeMetrics!.switcherButton.width * 3);
    expect(chromeMetrics!.quickActionsButton.y).toBeGreaterThan(chromeMetrics!.topBar.y + chromeMetrics!.topBar.height);
    expect(chromeMetrics!.settingsButton.y).toBeGreaterThan(chromeMetrics!.topBar.y + chromeMetrics!.topBar.height);
    expect(chromeMetrics!.addRemoteCount).toBe(0);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    await openWorkspaceSwitcher(page);
    expectBoxWithinViewport(await page.getByTestId("workspace-switcher-surface").boundingBox(), viewport!);

    await openLauncher(page);
    expectBoxWithinViewport(await page.getByTestId("quick-actions-surface").boundingBox(), viewport!);

    await openSettings(page);
    expectBoxWithinViewport(await page.getByTestId("settings-surface").boundingBox(), viewport!);

    await expect(page.getByTestId("workspace-tab-bar")).toBeVisible();
    await expect(page.getByTestId("workspace-tab-strip")).toBeVisible();
    await page.getByLabel("Close settings").click();
    await expect(page.getByTestId("settings-surface")).toBeHidden();
  });

  test("reopens the AI panel from the top shell control after hide plus focus-mode transition", async ({ page }) => {
    await page.goto(FRONTEND_URL);

    const aiPanel = page.locator("[data-waveai-panel='true']");
    await expect(aiPanel).toBeVisible();

    await openSettings(page);
    const overview = page.getByTestId("settings-overview-panel");
    const aiCheckbox = overview.getByLabel("AI").first();

    await expect(aiCheckbox).toBeChecked();
    await aiCheckbox.uncheck();
    await expect(aiPanel).toBeHidden();

    await overview.getByRole("button", { name: "Focus" }).click();
    await page.getByLabel("Close settings").click();
    await expect(page.getByTestId("settings-surface")).toBeHidden();

    await page.getByTestId("workspace-ai-toggle-button").click();
    await expect(aiPanel).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expectBoxWithinViewport(await aiPanel.boundingBox(), viewport!);
    await expect(page.getByTestId("workspace-tab-bar")).toBeVisible();
    await expect(page.getByTestId("workspace-tab-strip")).toBeVisible();
  });
});
