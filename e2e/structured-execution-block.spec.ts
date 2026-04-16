import { expect, test, type Page } from "@playwright/test";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..");
const AUTH_TOKEN = "playwright-structured-execution-token";
const OLLAMA_STUB_PORT = 11468;
const CORE_PORT = 61232;
const FRONTEND_PORT = 4188;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/`;

let ollamaStub: Server;
let coreProcess: ChildProcessWithoutNullStreams;
let frontendProcess: ChildProcessWithoutNullStreams;
let runtimeStateDir = "";

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

async function openAIPanel(page: Page): Promise<void> {
  await page.locator("div").filter({ hasText: /^AI$/ }).first().click();
  await expect(page.getByRole("textbox", { name: /Ask TideTerm AI anything/i })).toBeVisible();
}

test.describe.serial("structured execution block workflow", () => {
  test.beforeAll(async () => {
    ollamaStub = createServer((req, res) => {
      if (req.url === "/api/tags" && req.method === "GET") {
        const payload = JSON.stringify({ models: [{ name: "test-model" }] });
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
            model: "test-model",
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

    runtimeStateDir = mkdtempSync(path.join(tmpdir(), "rterm-pw-structured-exec-"));
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
          RTERM_OLLAMA_MODEL: "test-model",
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

  test("renders and actions structured execution block after /run", async ({ page, request }) => {
    const marker = `pw-structured-block-${Date.now()}`;
    const command = `echo ${marker}`;

    await page.goto(FRONTEND_URL);
    await openAIPanel(page);

    const promptBox = page.getByRole("textbox", { name: /Ask TideTerm AI anything/i });
    await promptBox.fill(`/run ${command}`);
    await promptBox.press("Enter");

    const blockList = page.getByTestId("execution-block-list");
    const blockItem = blockList.getByTestId("execution-block-item").first();
    await expect(blockList).toBeVisible();
    await expect(blockItem).toContainText(command);
    await expect(blockItem.getByTestId("execution-block-state")).toHaveText(/executed/i);
    await expect(blockItem).toContainText("local · local");
    await expect(blockItem).toContainText(marker);

    await blockItem.getByRole("button", { name: "Explain" }).click();
    await expect(page.getByText(`Explain execution block command: ${command}`)).toBeVisible();
    await expect(blockList).toContainText("1 recent");

    await blockItem.getByRole("button", { name: "Reveal Provenance" }).click();
    await expect(blockItem).toContainText("command audit");
    await expect(blockItem).toContainText("explain audit");

    const blockResponse = await request.get(`http://127.0.0.1:${CORE_PORT}/api/v1/execution/blocks?limit=1`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    expect(blockResponse.ok()).toBeTruthy();
    const blockPayload = (await blockResponse.json()) as {
      blocks?: Array<{
        target?: { target_session?: string; target_connection_id?: string };
      }>;
    };
    const firstBlock = blockPayload.blocks?.[0];
    expect(firstBlock?.target?.target_session).toBe("local");
    expect(firstBlock?.target?.target_connection_id).toBe("local");
  });
});
