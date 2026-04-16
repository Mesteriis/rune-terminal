import type { TerminalClient } from "@/rterm-api/terminal/client";
import { buildRuntimeTerminalStreamUrl, resolveStreamMode, shouldUseQueryTokenForStream } from "@/runtime/stream";
import type { RuntimeConfig } from "@/runtime/types";
import type { RestartSessionResponse, SendInputRequest, SendInputResponse, TerminalSnapshot } from "@/rterm-api/terminal/types";
import type { TerminalStreamEvents } from "@/rterm-api/http/sse";
import type { StreamAuthMode } from "@/runtime/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface TerminalFacade {
  getSnapshot: (widgetId: string, from?: number) => Promise<TerminalSnapshot>;
  sendInput: (widgetId: string, payload: SendInputRequest) => Promise<SendInputResponse>;
  restartSession: (widgetId: string) => Promise<RestartSessionResponse>;
  buildStreamUrl: (widgetId: string, options?: { from?: number }) => string;
  consumeStream: (
    widgetId: string,
    handlers: TerminalStreamEvents,
    options?: {
      from?: number;
      signal?: AbortSignal;
    },
  ) => Promise<void>;
}

export interface TerminalStreamFacadeOptions {
  from?: number;
  signal?: AbortSignal;
}

let terminalFacadePromise: Promise<TerminalFacade> | null = null;

function buildTerminalFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<TerminalFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ runtime, clients }) => {
    return createTerminalFacade(clients.terminal, runtime);
  });
  facadePromise.catch(() => {
    terminalFacadePromise = null;
  });
  return facadePromise;
}

export function getTerminalFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<TerminalFacade> {
  if (terminalFacadePromise == null) {
    terminalFacadePromise = buildTerminalFacade(fetchImpl);
  }
  return terminalFacadePromise;
}

export function getTerminalStreamMode(runtime: RuntimeConfig): StreamAuthMode {
  return resolveStreamMode(runtime);
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
    restartSession(widgetId): Promise<RestartSessionResponse> {
      return client.restartSession(widgetId);
    },
    buildStreamUrl(widgetId, options = {}) {
      return buildTerminalStreamUrl(runtime, widgetId, options);
    },
    consumeStream(widgetId, handlers, options = {}) {
      return client.consumeStream(widgetId, handlers, {
        from: options.from,
        useQueryToken: shouldUseQueryTokenForStream(runtime),
        signal: options.signal,
      });
    },
  };
}
