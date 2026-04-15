import type { TerminalClient } from "@/rterm-api/terminal/client";
import { buildRuntimeTerminalStreamUrl, shouldUseQueryTokenForStream } from "@/runtime/stream";
import type { RuntimeConfig } from "@/runtime/types";
import type { SendInputRequest, SendInputResponse, TerminalSnapshot } from "@/rterm-api/terminal/types";
import type { TerminalStreamEvents } from "@/rterm-api/http/sse";
import type { StreamAuthMode } from "@/runtime/types";

export interface TerminalFacade {
  getSnapshot: (widgetId: string, from?: number) => Promise<TerminalSnapshot>;
  sendInput: (widgetId: string, payload: SendInputRequest) => Promise<SendInputResponse>;
  buildStreamUrl: (widgetId: string, options?: { from?: number }) => string;
  consumeStream: (
    widgetId: string,
    handlers: TerminalStreamEvents,
    options?: { from?: number },
  ) => Promise<void>;
}

export interface TerminalStreamFacadeOptions {
  from?: number;
}

export function getTerminalStreamMode(runtime: RuntimeConfig): StreamAuthMode {
  return shouldUseQueryTokenForStream(runtime) ? "query-token" : "none";
}

export function buildTerminalStreamUrl(runtime: RuntimeConfig, widgetId: string, options: TerminalStreamFacadeOptions = {}): string {
  return buildRuntimeTerminalStreamUrl(runtime, widgetId, { from: options.from, includeQueryToken: shouldUseQueryTokenForStream(runtime) });
}

export function createTerminalFacade(client: TerminalClient, runtime: RuntimeConfig): TerminalFacade {
  return {
    getSnapshot(widgetId, from = 0): Promise<TerminalSnapshot> {
      return client.getSnapshot(widgetId, from);
    },
    sendInput(widgetId, payload: SendInputRequest): Promise<SendInputResponse> {
      return client.sendInput(widgetId, payload);
    },
    buildStreamUrl(widgetId, options = {}) {
      return buildTerminalStreamUrl(runtime, widgetId, options);
    },
    consumeStream(widgetId, handlers, options = {}) {
      return client.consumeStream(widgetId, handlers, {
        from: options.from,
        useQueryToken: shouldUseQueryTokenForStream(runtime),
      });
    },
  };
}
