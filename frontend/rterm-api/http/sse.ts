import type { TerminalOutputChunk } from "../terminal/types";
import { ApiError } from "./errors";
import { HttpClient } from "./client";

export interface TerminalStreamPayload {
  from?: number;
  authToken?: string;
  useQueryToken?: boolean;
}

export interface TerminalStreamEvents {
  onOutput: (chunk: TerminalOutputChunk) => void | Promise<void>;
  onKeepAlive?: () => void;
  onUnknownEvent?: (event: string, data: string) => void;
}

export interface TerminalStreamUrlOptions {
  from?: number;
  token?: string;
}

export function buildTerminalStreamUrl(baseUrl: string, widgetId: string, options: TerminalStreamUrlOptions = {}): string {
  const url = new URL(`/api/v1/terminal/${encodeURIComponent(widgetId)}/stream`, baseUrl);
  if (options.from !== undefined) {
    url.searchParams.set("from", String(options.from));
  }
  if (options.token) {
    url.searchParams.set("token", options.token);
  }
  return url.toString();
}

export async function consumeTerminalStream(
  response: Response,
  handlers: TerminalStreamEvents,
): Promise<void> {
  if (!response.body) {
    throw new ApiError({
      status: 0,
      code: "streaming_unsupported",
      message: "Response body is not readable",
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "output";
  let eventData = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (eventData) {
        await flushEvent(eventName, eventData, handlers);
      }
      return;
    }
    const text = decoder.decode(value, { stream: true });
    buffer += text;

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (trimmed === "") {
        if (eventData) {
          await flushEvent(eventName, eventData, handlers);
        }
        eventName = "output";
        eventData = "";
        continue;
      }

      if (trimmed.startsWith(":")) {
        if (trimmed.includes("keepalive")) {
          handlers.onKeepAlive?.();
        }
        continue;
      }

      const separatorIndex = trimmed.indexOf(":");
      if (separatorIndex < 0) {
        continue;
      }

      const field = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trimStart();
      if (field === "event") {
        eventName = value || "output";
      } else if (field === "data") {
        eventData = eventData ? `${eventData}\n${value}` : value;
      }
    }
  }
}

async function flushEvent(eventName: string, eventData: string, handlers: TerminalStreamEvents): Promise<void> {
  if (eventName === "output") {
    const parsed = JSON.parse(eventData) as TerminalOutputChunk;
    await handlers.onOutput(parsed);
    return;
  }
  handlers.onUnknownEvent?.(eventName, eventData);
}

export async function consumeTerminalStreamViaClient(
  client: HttpClient,
  widgetId: string,
  handlers: TerminalStreamEvents,
  options: TerminalStreamPayload = {},
): Promise<void> {
  const path = `/api/v1/terminal/${encodeURIComponent(widgetId)}/stream`;
  const response = await client.requestRaw("GET", path, {
    query: {
      from: options.from ?? 0,
      token: options.useQueryToken ? options.authToken : undefined,
    },
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
    includeAuth: !options.useQueryToken,
  });
  await consumeTerminalStream(response, handlers);
}
