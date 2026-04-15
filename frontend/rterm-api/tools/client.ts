import type { ToolExecutionRequest, ToolExecutionResponse, ToolsListResponse } from "./types";
import { HttpClient } from "../http/client";

export class ToolsClient {
  constructor(private readonly http: HttpClient) {}

  listTools(): Promise<ToolsListResponse> {
    return this.http.get<ToolsListResponse>("/api/v1/tools");
  }

  executeTool(payload: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    return this.http.post<ToolExecutionResponse, ToolExecutionRequest>("/api/v1/tools/execute", {
      body: payload,
    });
  }
}
