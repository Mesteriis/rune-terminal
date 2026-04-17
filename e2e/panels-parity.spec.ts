import { expect, test, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-panels-parity-token";

let OLLAMA_STUB_PORT = 0;
let CORE_PORT = 0;
let FRONTEND_PORT = 0;
let FRONTEND_URL = "";

let ollamaStub: Server;
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

async function openAIPanel(page: Page): Promise<void> {
  const promptBox = page.locator("[data-waveai-panel='true'] textarea").first();
  if (await promptBox.isVisible().catch(() => false)) {
    return;
  }
  await page.locator("div").filter({ hasText: /^AI$/ }).first().click();
  await expect(promptBox).toBeVisible();
}

async function openSettings(page: Page): Promise<void> {
  const settingsSurface = page.getByTestId("settings-surface");
  if (await settingsSurface.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId("workspace-settings-button").click();
  await expect(settingsSurface).toBeVisible();
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

test.describe.serial("panels parity", () => {
  test.beforeAll(async () => {
    OLLAMA_STUB_PORT = await allocatePort();
    CORE_PORT = await allocatePort();
    FRONTEND_PORT = await allocatePort();
    FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/`;

    ollamaStub = createServer((req, res) => {
      if (req.url === "/api/tags" && req.method === "GET") {
        const payload = JSON.stringify({ models: [{ name: "panels-test-model" }] });
        res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) });
        res.end(payload);
        return;
      }
      if (req.url === "/api/chat" && req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        req.on("end", () => {
          let prompt = "";
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            const messages: Array<{ role?: string; content?: string }> = Array.isArray(body.messages) ? body.messages : [];
            for (const message of messages) {
              if ((message.role || "").trim() === "user") {
                prompt = (message.content || "").trim();
              }
            }
          } catch {
            prompt = "";
          }
          const payload = JSON.stringify({
            model: "panels-test-model",
            created_at: "2026-04-17T00:00:00Z",
            message: {
              role: "assistant",
              content: `stub-response: ${prompt}`,
            },
            done: true,
          });
          res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) });
          res.end(payload);
        });
        return;
      }
      const notFound = JSON.stringify({ error: "not found" });
      res.writeHead(404, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(notFound) });
      res.end(notFound);
    });
    await new Promise<void>((resolve, reject) => {
      ollamaStub.once("error", reject);
      ollamaStub.listen(OLLAMA_STUB_PORT, "127.0.0.1", () => resolve());
    });

    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-panels-parity-"));
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
          RTERM_OLLAMA_BASE_URL: `http://127.0.0.1:${OLLAMA_STUB_PORT}`,
          RTERM_OLLAMA_MODEL: "panels-test-model",
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
    await new Promise<void>((resolve) => {
      ollamaStub.close(() => resolve());
    });
    if (runtimeStateDir !== "") {
      rmSync(runtimeStateDir, { recursive: true, force: true });
    }
  });

  test("settings utility surfaces stay bounded and switch across all panel views", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await openAIPanel(page);
    await openSettings(page);

    const settingsSurface = page.getByTestId("settings-surface");
    const aiPanel = page.locator("[data-waveai-panel='true']");
    await expect(settingsSurface).toBeVisible();
    await expect(aiPanel).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expectBoxWithinViewport(await settingsSurface.boundingBox(), viewport!);
    expectBoxWithinViewport(await aiPanel.boundingBox(), viewport!);

    await expect(page.getByTestId("settings-overview-panel")).toBeVisible();
    await expect(page.getByText("Settings & Help")).toBeVisible();
    await expect(page.getByText("Open full settings")).toBeVisible();
    await expect(page.getByText("Open secrets manager")).toBeVisible();
    await expect(page.getByText("Open help view")).toBeVisible();

    await page.getByTestId("settings-view-trusted-tools").click();
    const trustedToolsPanel = page.getByTestId("trusted-tools-panel");
    await expect(trustedToolsPanel).toBeVisible();
    await expect(trustedToolsPanel.getByText("Trusted tools")).toBeVisible();
    await expect(trustedToolsPanel.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(trustedToolsPanel.getByText(/Open Tools|Tools hidden by layout/)).toBeVisible();

    await page.getByTestId("settings-view-secret-shield").click();
    const secretShieldPanel = page.getByTestId("secret-shield-panel");
    await expect(secretShieldPanel).toBeVisible();
    await expect(secretShieldPanel.getByText("Secret shield")).toBeVisible();
    await expect(secretShieldPanel.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(secretShieldPanel.getByText(/Open Tools|Tools hidden by layout/)).toBeVisible();

    await page.getByTestId("settings-view-help").click();
    await expect(page.getByTestId("help-panel")).toBeVisible();
    await expect(page.getByText("Open the dedicated help view")).toBeVisible();

    await page.getByLabel("Close settings").click();
    await expect(settingsSurface).not.toBeVisible();
    await expect(aiPanel).toBeVisible();
  });

  test("ai panel keeps explicit mode and context controls while message and explain flows work", async ({ page }) => {
    const marker = `panels-parity-${Date.now()}`;
    const prompt = "Panels parity validation prompt";

    await page.goto(FRONTEND_URL);
    await openAIPanel(page);

    const aiPanel = page.locator("[data-waveai-panel='true']");
    const promptBox = aiPanel.locator("textarea").first();
    const contextToggle = aiPanel.locator("button[title^='Widget Access ']").first();
    const modeSelect = page.getByTestId("agent-mode-select");

    await expect(aiPanel).toBeVisible();
    await expect(page.getByText("Welcome to TideTerm AI")).toBeVisible();
    await expect(page.getByTestId("ai-mode-strip")).toBeVisible();
    await expect(modeSelect).toBeVisible();
    await expect(promptBox).toBeVisible();
    await expect(promptBox).toHaveAttribute("placeholder", "Ask TideTerm AI anything...");
    await expect(contextToggle).toHaveAttribute("title", "Widget Access ON");

    await contextToggle.click();
    await expect(contextToggle).toHaveAttribute("title", "Widget Access OFF");
    await contextToggle.click();
    await expect(contextToggle).toHaveAttribute("title", "Widget Access ON");

    await modeSelect.selectOption("review");
    await expect(modeSelect).toHaveValue("review");
    await modeSelect.selectOption("implement");
    await expect(modeSelect).toHaveValue("implement");

    await promptBox.fill(prompt);
    await promptBox.press("Enter");
    await expect(page.getByText(`stub-response: ${prompt}`)).toBeVisible();

    await promptBox.fill(`/run echo ${marker}`);
    await promptBox.press("Enter");
    const executionBlock = page.getByTestId("execution-block-item").first();
    await expect(executionBlock).toContainText(`echo ${marker}`);
    await expect(executionBlock.getByTestId("execution-block-state")).toHaveText(/executed/i);
    await expect(executionBlock).toContainText("local · local");

    await executionBlock.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText(`Explain execution block command: echo ${marker}`).first()).toBeVisible();
  });
});
