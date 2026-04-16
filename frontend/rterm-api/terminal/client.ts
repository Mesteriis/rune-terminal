import type { RestartSessionResponse, SendInputRequest, SendInputResponse, TerminalSnapshot } from "./types";
import { HttpClient } from "../http/client";
import { consumeTerminalStreamViaClient, buildTerminalStreamUrl } from "../http/sse";
import type { TerminalStreamEvents } from "../http/sse";

export interface TerminalStreamRequestOptions {
  from?: number;
  useQueryToken?: boolean;
  signal?: AbortSignal;
}

export class TerminalClient {
  constructor(private readonly http: HttpClient) {}

  getSnapshot(widgetId: string, from = 0): Promise<TerminalSnapshot> {
    return this.http.get<TerminalSnapshot>(`/api/v1/terminal/${encodeURIComponent(widgetId)}`, {
      query: { from },
    });
  }

  sendInput(widgetId: string, payload: SendInputRequest): Promise<SendInputResponse> {
    return this.http.post<SendInputResponse, SendInputRequest>(
      `/api/v1/terminal/${encodeURIComponent(widgetId)}/input`,
      { body: payload },
    );
  }

  restartSession(widgetId: string): Promise<RestartSessionResponse> {
    return this.http.post<RestartSessionResponse>(`/api/v1/terminal/${encodeURIComponent(widgetId)}/restart`);
  }

  getStreamUrl(widgetId: string, options: TerminalStreamRequestOptions = {}): string {
    return buildTerminalStreamUrl(this.http.baseUrl, widgetId, {
      from: options.from,
      token: options.useQueryToken ? this.http.authToken : undefined,
    });
  }

  consumeStream(widgetId: string, handlers: TerminalStreamEvents, options: TerminalStreamRequestOptions = {}): Promise<void> {
    return consumeTerminalStreamViaClient(this.http, widgetId, handlers, {
      from: options.from,
      authToken: this.http.authToken,
      useQueryToken: options.useQueryToken ?? false,
      signal: options.signal,
    });
  }
}
