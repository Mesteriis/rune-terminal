import type {
  ConversationSnapshotResponse,
  ExplainTerminalCommandRequest,
  ExplainTerminalCommandResponse,
  SubmitConversationMessageRequest,
  SubmitConversationMessageResponse,
} from "./types";
import { HttpClient } from "../http/client";

export class ConversationClient {
  constructor(private readonly http: HttpClient) {}

  getSnapshot(): Promise<ConversationSnapshotResponse> {
    return this.http.get<ConversationSnapshotResponse>("/api/v1/agent/conversation");
  }

  submitMessage(payload: SubmitConversationMessageRequest): Promise<SubmitConversationMessageResponse> {
    return this.http.post<SubmitConversationMessageResponse, SubmitConversationMessageRequest>(
      "/api/v1/agent/conversation/messages",
      {
        body: payload,
      },
    );
  }

  explainTerminalCommand(payload: ExplainTerminalCommandRequest): Promise<ExplainTerminalCommandResponse> {
    return this.http.post<ExplainTerminalCommandResponse, ExplainTerminalCommandRequest>(
      "/api/v1/agent/terminal-commands/explain",
      {
        body: payload,
      },
    );
  }
}
