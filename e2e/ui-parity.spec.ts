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
const AUTH_TOKEN = "playwright-ui-parity-token";
const COMPAT_LAYOUT_FRAME_TOLERANCE_PX = 6;

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

async function openAIPanel(page: Page): Promise<void> {
  const panel = page.locator("[data-waveai-panel='true']");
  if (await panel.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-ai-toggle-button").click();
  if (await panel.isVisible().catch(() => false)) {
    return;
  }

  await openSettings(page);
  const overview = page.getByTestId("settings-overview-panel");
  const aiCheckbox = overview.getByLabel("AI").first();
  if (!(await aiCheckbox.isChecked())) {
    await aiCheckbox.check();
  }
  await page.getByRole("button", { name: "Close Settings & Help" }).click();
  await page.getByTestId("workspace-ai-toggle-button").click();
  await expect(panel).toBeVisible();
}

async function expectCompatLayoutToFill(page: Page): Promise<void> {
  await expect(page.locator("[data-testid='compat-window-layout']")).toBeVisible();
  const metrics = await page.evaluate(() => {
    const layout = document.querySelector<HTMLElement>("[data-testid='compat-window-layout']");
    const wrapper = layout?.parentElement as HTMLElement | null;
    const pane = document.querySelector<HTMLElement>("[data-testid^='compat-widget-pane-']");
    if (layout == null || wrapper == null || pane == null) {
      return null;
    }
    const wrapperRect = wrapper.getBoundingClientRect();
    const layoutRect = layout.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    return {
      wrapperHeight: Math.round(wrapperRect.height),
      wrapperWidth: Math.round(wrapperRect.width),
      layoutHeight: Math.round(layoutRect.height),
      layoutWidth: Math.round(layoutRect.width),
      paneHeight: Math.round(paneRect.height),
      paneWidth: Math.round(paneRect.width),
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.layoutHeight).toBeGreaterThanOrEqual(metrics!.wrapperHeight - COMPAT_LAYOUT_FRAME_TOLERANCE_PX);
  expect(metrics!.layoutWidth).toBeGreaterThanOrEqual(metrics!.wrapperWidth - COMPAT_LAYOUT_FRAME_TOLERANCE_PX);
  expect(metrics!.paneHeight).toBeGreaterThanOrEqual(metrics!.layoutHeight - 4);
  expect(metrics!.paneWidth).toBeGreaterThanOrEqual(metrics!.layoutWidth - 4);
}

test.describe.serial("remaining ui parity", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-ui-parity-"));
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

  test("renders compact terminal pane chrome with visible drag and status affordances", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await expectCompatLayoutToFill(page);

    const header = page.locator("[data-testid^='compat-terminal-header-']").first();
    await expect(header).toBeVisible();

    const metrics = await page.evaluate(() => {
      const headerElement = document.querySelector<HTMLElement>("[data-testid^='compat-terminal-header-']");
      if (headerElement == null) {
        return null;
      }
      const rect = headerElement.getBoundingClientRect();
      const buttonLabels = Array.from(headerElement.querySelectorAll("button")).map(
        (button) => button.getAttribute("aria-label")?.trim() || button.getAttribute("title")?.trim() || "",
      );
      return {
        height: Math.round(rect.height),
        text: headerElement.innerText.toUpperCase(),
        gripCount: headerElement.querySelectorAll(".fa-grip-vertical").length,
        buttonLabels,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.height).toBeGreaterThanOrEqual(30);
    expect(metrics!.height).toBeLessThanOrEqual(40);
    expect(metrics!.gripCount).toBeGreaterThanOrEqual(1);
    expect(metrics!.text).toContain("LOCAL");
    expect(metrics!.text).toMatch(/CONNECTED|RESTORED|DISCONNECTED|STATUS UNKNOWN/);
    expect(metrics!.text).toMatch(/AI READY|AI BLOCKED|AI IDLE/);
    expect(metrics!.buttonLabels).toEqual(expect.arrayContaining(["Split pane", "Restart session", "Explain latest output"]));
  });

  test("supports draggable bounded settings overlay without disturbing pane chrome", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await openSettings(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const surface = page.getByTestId("settings-surface");
    const initialBox = await surface.boundingBox();
    expectBoxWithinViewport(initialBox, viewport!);
    expect(initialBox).not.toBeNull();

    const dragStartX = initialBox!.x + 90;
    const dragStartY = initialBox!.y + 20;
    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.mouse.move(dragStartX - 180, dragStartY + 80, { steps: 20 });
    await page.mouse.up();

    const movedBox = await surface.boundingBox();
    expectBoxWithinViewport(movedBox, viewport!);
    expect(movedBox).not.toBeNull();
    expect(movedBox!.x).toBeLessThan(initialBox!.x - 100);

    const clampStartX = movedBox!.x + 90;
    const clampStartY = movedBox!.y + 20;
    await page.mouse.move(clampStartX, clampStartY);
    await page.mouse.down();
    await page.mouse.move(-200, -200, { steps: 25 });
    await page.mouse.up();

    const clampedBox = await surface.boundingBox();
    expectBoxWithinViewport(clampedBox, viewport!);
    expect(clampedBox).not.toBeNull();
    expect(clampedBox!.x).toBeGreaterThanOrEqual(0);
    expect(clampedBox!.x).toBeLessThanOrEqual(24);
    expect(clampedBox!.y).toBeGreaterThanOrEqual(0);
    expect(clampedBox!.y).toBeLessThanOrEqual(24);
    expectBoxWithinViewport(await page.locator("[data-testid^='compat-terminal-header-']").first().boundingBox(), viewport!);
  });

  test("keeps pane chrome stable after opening settings and launcher surfaces", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await openSettings(page);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    expectBoxWithinViewport(await page.locator("[data-testid^='compat-terminal-header-']").first().boundingBox(), viewport!);
    expectBoxWithinViewport(await page.getByTestId("settings-surface").boundingBox(), viewport!);

    await page.getByRole("button", { name: "Close Settings & Help" }).click();
    await expect(page.getByTestId("settings-surface")).toBeHidden();

    await openLauncher(page);
    expectBoxWithinViewport(await page.getByTestId("quick-actions-surface").boundingBox(), viewport!);
    await expectCompatLayoutToFill(page);
  });
});
