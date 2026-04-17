import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-terminal-parity-token";

let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

type ContextMenuEntry = {
  label?: string;
  type?: string;
  enabled?: boolean;
  submenu?: ContextMenuEntry[];
};

type WorkspaceSnapshot = {
  active_widget_id?: string;
  widgets?: Array<{
    id?: string;
    kind?: string;
    path?: string;
    connection_id?: string;
  }>;
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

async function getWorkspaceSnapshot(request: APIRequestContext): Promise<WorkspaceSnapshot> {
  const response = await request.get(`http://127.0.0.1:${CORE_PORT}/api/v1/workspace`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as WorkspaceSnapshot;
}

async function sendTerminalInput(
  request: APIRequestContext,
  widgetId: string,
  text: string,
  appendNewline = true,
): Promise<void> {
  const response = await request.post(`http://127.0.0.1:${CORE_PORT}/api/v1/terminal/${encodeURIComponent(widgetId)}/input`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: {
      text,
      append_newline: appendNewline,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function getTerminalSnapshot(request: APIRequestContext, widgetId: string): Promise<{ state?: { working_dir?: string } }> {
  const response = await request.get(`http://127.0.0.1:${CORE_PORT}/api/v1/terminal/${encodeURIComponent(widgetId)}`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { state?: { working_dir?: string } };
}

async function installDebugHooks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const debugWindow = window as typeof window & {
      __RTERM_LAST_CONTEXT_MENU?: Array<{ label?: string; click?: () => void; type?: string; enabled?: boolean }>;
    };
    debugWindow.__RTERM_LAST_CONTEXT_MENU = [];
  });
}

async function getActiveWidgetId(page: Page): Promise<string> {
  const pane = page.locator("[data-testid^='compat-widget-pane-']").first();
  await expect(pane).toBeVisible();
  const testId = await pane.getAttribute("data-testid");
  expect(testId).not.toBeNull();
  return String(testId).replace("compat-widget-pane-", "");
}

async function waitForTerminalHook(page: Page, widgetId: string): Promise<void> {
  await expect.poll(async () => {
    return page.evaluate((targetWidgetId) => {
      const debugWindow = window as typeof window & {
        __RTERM_COMPAT_TERMS?: Record<string, { terminal?: object }>;
      };
      return debugWindow.__RTERM_COMPAT_TERMS?.[targetWidgetId] != null;
    }, widgetId);
  }).toBe(true);
}

async function getTerminalBufferText(page: Page, widgetId: string): Promise<string> {
  return page.evaluate((targetWidgetId) => {
    const debugWindow = window as typeof window & {
      __RTERM_COMPAT_TERMS?: Record<
        string,
        {
          terminal?: {
            buffer: {
              active: {
                length: number;
                getLine: (index: number) => { translateToString: (trimRight?: boolean) => string } | undefined;
              };
            };
          };
        }
      >;
    };
    const termWrap = debugWindow.__RTERM_COMPAT_TERMS?.[targetWidgetId];
    const terminal = termWrap?.terminal;
    if (terminal == null) {
      return "";
    }
    const lines: string[] = [];
    for (let i = 0; i < terminal.buffer.active.length; i += 1) {
      const line = terminal.buffer.active.getLine(i);
      if (line == null) {
        continue;
      }
      lines.push(line.translateToString(true));
    }
    return lines.join("\n");
  }, widgetId);
}

async function getLastNonEmptyTerminalLine(page: Page, widgetId: string): Promise<string> {
  return page.evaluate((targetWidgetId) => {
    const debugWindow = window as typeof window & {
      __RTERM_COMPAT_TERMS?: Record<
        string,
        {
          terminal?: {
            buffer: {
              active: {
                length: number;
                getLine: (index: number) => { translateToString: (trimRight?: boolean) => string } | undefined;
              };
            };
          };
        }
      >;
    };
    const terminal = debugWindow.__RTERM_COMPAT_TERMS?.[targetWidgetId]?.terminal;
    if (terminal == null) {
      return "";
    }
    for (let i = terminal.buffer.active.length - 1; i >= 0; i -= 1) {
      const text = terminal.buffer.active.getLine(i)?.translateToString(true)?.trim() ?? "";
      if (text !== "") {
        return text;
      }
    }
    return "";
  }, widgetId);
}

async function waitForBufferToContain(page: Page, widgetId: string, marker: string): Promise<void> {
  await expect.poll(async () => {
    return (await getTerminalBufferText(page, widgetId)).includes(marker);
  }).toBe(true);
}

function countOccurrences(text: string, marker: string): number {
  if (marker === "") {
    return 0;
  }
  return text.split(marker).length - 1;
}

async function getViewportMetrics(page: Page, widgetId: string): Promise<{ scrollTop: number; scrollHeight: number; clientHeight: number }> {
  return page.getByTestId(`compat-widget-pane-${widgetId}`).locator(".xterm-viewport").evaluate((node) => {
    const viewport = node as HTMLDivElement;
    return {
      scrollTop: viewport.scrollTop,
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
    };
  });
}

function isNearBottom(metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }): boolean {
  return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 4;
}

async function dropNativeFileIntoTerminal(page: Page, targetWidgetId: string, fileUrl: string): Promise<void> {
  const target = page.getByTestId(`compat-widget-pane-${targetWidgetId}`).locator(".term-connectelem");
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  const dataTransfer = await page.evaluateHandle((nativeFileUrl) => {
    const dt = new DataTransfer();
    dt.setData("text/uri-list", nativeFileUrl);
    dt.setData("text/plain", nativeFileUrl);
    return dt;
  }, fileUrl);
  const clientX = Math.floor(targetBox!.x + targetBox!.width * 0.5);
  const clientY = Math.floor(targetBox!.y + targetBox!.height * 0.5);
  await target.dispatchEvent("dragover", { dataTransfer, clientX, clientY });
  await target.dispatchEvent("drop", { dataTransfer, clientX, clientY });
  await dataTransfer.dispose();
}

async function openTerminalContextMenu(page: Page, widgetId: string): Promise<void> {
  await page.getByTestId(`compat-widget-pane-${widgetId}`).click({ button: "right" });
  await expect.poll(async () => {
    return page.evaluate(() => {
      const debugWindow = window as typeof window & {
        __RTERM_LAST_CONTEXT_MENU?: ContextMenuEntry[];
      };
      return Array.isArray(debugWindow.__RTERM_LAST_CONTEXT_MENU) && debugWindow.__RTERM_LAST_CONTEXT_MENU.length > 0;
    });
  }).toBe(true);
}

async function getCapturedContextMenu(page: Page): Promise<ContextMenuEntry[]> {
  return page.evaluate(() => {
    const debugWindow = window as typeof window & {
      __RTERM_LAST_CONTEXT_MENU?: ContextMenuEntry[];
    };
    return debugWindow.__RTERM_LAST_CONTEXT_MENU ?? [];
  });
}

async function triggerCapturedContextMenuItem(page: Page, label: string): Promise<void> {
  await page.evaluate((targetLabel) => {
    const debugWindow = window as typeof window & {
      __RTERM_LAST_CONTEXT_MENU?: Array<{ label?: string; click?: () => void }>;
    };
    const item = (debugWindow.__RTERM_LAST_CONTEXT_MENU ?? []).find((candidate) => candidate.label === targetLabel);
    if (item?.click == null) {
      throw new Error(`context menu item not found: ${targetLabel}`);
    }
    item.click();
  }, label);
}

test.describe.serial("terminal parity behaviors", () => {
  test.beforeAll(async () => {
    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-terminal-parity-"));

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

  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(FRONTEND_URL).origin });
    await installDebugHooks(page);
    await page.goto(FRONTEND_URL);
    const widgetId = await getActiveWidgetId(page);
    await waitForTerminalHook(page, widgetId);
    await expect.poll(async () => {
      return (await getTerminalBufferText(page, widgetId)).length > 0;
    }).toBe(true);
  });

  test("hydrates scrollback on reload without missing or duplicate buffered lines", async ({ page, request }) => {
    const widgetId = await getActiveWidgetId(page);
    const runId = `hydr-${Date.now()}`;
    const markers = Array.from({ length: 12 }, (_, index) => `${runId}-${index + 1}`);
    await sendTerminalInput(request, widgetId, `for i in $(seq 1 12); do echo ${runId}-$i; done`);
    await waitForBufferToContain(page, widgetId, markers[markers.length - 1]);

    const beforeReload = await getTerminalBufferText(page, widgetId);
    const countsBefore = new Map(markers.map((marker) => [marker, countOccurrences(beforeReload, marker)]));

    await page.reload();
    const widgetIdAfterReload = await getActiveWidgetId(page);
    await waitForTerminalHook(page, widgetIdAfterReload);
    await waitForBufferToContain(page, widgetIdAfterReload, markers[markers.length - 1]);

    const afterReload = await getTerminalBufferText(page, widgetIdAfterReload);
    for (const marker of markers) {
      expect(countOccurrences(afterReload, marker)).toBe(countsBefore.get(marker));
    }

    const liveMarker = `${runId}-live-after-reload`;
    await sendTerminalInput(request, widgetIdAfterReload, `echo ${liveMarker}`);
    await waitForBufferToContain(page, widgetIdAfterReload, liveMarker);
  });

  test("supports copy and paste keyboard shortcuts on the active compat terminal", async ({ page, request }) => {
    const widgetId = await getActiveWidgetId(page);
    const copyMarker = `copy-marker-${Date.now()}`;
    const pasteMarker = `paste-marker-${Date.now()}`;

    await sendTerminalInput(request, widgetId, `echo ${copyMarker}`);
    await waitForBufferToContain(page, widgetId, copyMarker);

    const selectedText = await page.evaluate((targetWidgetId) => {
      const debugWindow = window as typeof window & {
        __RTERM_COMPAT_TERMS?: Record<
          string,
          {
            terminal?: {
              selectAll: () => void;
              getSelection: () => string;
              focus: () => void;
            };
          }
        >;
      };
      const terminal = debugWindow.__RTERM_COMPAT_TERMS?.[targetWidgetId]?.terminal;
      if (terminal == null) {
        return "";
      }
      terminal.selectAll();
      terminal.focus();
      return terminal.getSelection();
    }, widgetId);
    expect(selectedText).toContain(copyMarker);

    await page.keyboard.press("Control+Shift+C");

    await expect.poll(async () => {
      return page.evaluate(() => navigator.clipboard.readText());
    }).toContain(copyMarker);

    await page.evaluate(async (command) => {
      await navigator.clipboard.writeText(command);
    }, `echo ${pasteMarker}`);

    await page.getByTestId(`compat-widget-pane-${widgetId}`).click();
    await page.keyboard.press("Control+Shift+V");
    await page.keyboard.press("Enter");

    await waitForBufferToContain(page, widgetId, pasteMarker);
  });

  test("jumps back to the latest output after leaving follow mode", async ({ page, request }) => {
    const widgetId = await getActiveWidgetId(page);
    const runId = `jump-${Date.now()}`;

    await sendTerminalInput(request, widgetId, `for i in $(seq 1 140); do echo ${runId}-$i; done`);
    await waitForBufferToContain(page, widgetId, `${runId}-140`);

    await page.getByTestId(`compat-widget-pane-${widgetId}`).click();
    await page.keyboard.press("Shift+Home");
    await expect.poll(async () => (await getViewportMetrics(page, widgetId)).scrollTop).toBe(0);

    await sendTerminalInput(request, widgetId, `echo ${runId}-while-scrolled`);
    await waitForBufferToContain(page, widgetId, `${runId}-while-scrolled`);
    await expect.poll(async () => isNearBottom(await getViewportMetrics(page, widgetId))).toBe(false);

    await page.getByTestId(`compat-widget-pane-${widgetId}`).click();
    await page.keyboard.press("Shift+End");
    await expect.poll(async () => isNearBottom(await getViewportMetrics(page, widgetId))).toBe(true);

    await sendTerminalInput(request, widgetId, `echo ${runId}-after-end`);
    await waitForBufferToContain(page, widgetId, `${runId}-after-end`);
    await expect.poll(async () => isNearBottom(await getViewportMetrics(page, widgetId))).toBe(true);
  });

  test("inserts dragged file paths into the terminal without auto-executing them", async ({ page }) => {
    const widgetId = await getActiveWidgetId(page);
    const readmePath = path.join(REPO_ROOT, "README.md");
    const readmeUrl = pathToFileURL(readmePath).toString();

    await page.getByTestId(`compat-widget-pane-${widgetId}`).click();
    await page.keyboard.press("Control+C");
    await dropNativeFileIntoTerminal(page, widgetId, readmeUrl);

    await expect.poll(async () => {
      return (await getLastNonEmptyTerminalLine(page, widgetId)).includes(readmePath);
    }).toBe(true);
  });

  test("opens the current terminal directory in a new block with preserved local path context", async ({ page, request }) => {
    const widgetId = await getActiveWidgetId(page);
    const terminalSnapshot = await getTerminalSnapshot(request, widgetId);
    const expectedPath = terminalSnapshot.state?.working_dir ?? REPO_ROOT;

    await openTerminalContextMenu(page, widgetId);
    const menu = await getCapturedContextMenu(page);
    expect(menu.some((item) => item.label === "Open Current Directory in New Block")).toBe(true);

    const workspaceBefore = await getWorkspaceSnapshot(request);
    const widgetCountBefore = (workspaceBefore.widgets ?? []).length;

    await triggerCapturedContextMenuItem(page, "Open Current Directory in New Block");

    await expect.poll(async () => {
      const snapshot = await getWorkspaceSnapshot(request);
      return (snapshot.widgets ?? []).length;
    }).toBe(widgetCountBefore + 1);

    const workspaceAfter = await getWorkspaceSnapshot(request);
    const filesWidget = (workspaceAfter.widgets ?? []).find((candidate) => candidate.kind === "files" && candidate.path === expectedPath);
    expect(filesWidget).toBeTruthy();
    expect(filesWidget?.connection_id).toBe("local");

    await expect(page.getByTestId(`compat-files-widget-${filesWidget!.id}`)).toBeVisible();
    await expect(page.getByTestId(`compat-files-widget-${filesWidget!.id}`)).toContainText(expectedPath);
    await expect(page.getByTestId(`compat-files-widget-${filesWidget!.id}`)).toContainText("README.md");
  });
});
