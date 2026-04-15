import type { ToolExecutionRequest, ToolExecutionResponse, ToolsListResponse } from "./types";
import { ApiError } from "../http/errors";
import { HttpClient } from "../http/client";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isToolExecutionResponse(value: unknown): value is ToolExecutionResponse {
  return isObject(value) && typeof value.status === "string";
}

export class ToolsClient {
  constructor(private readonly http: HttpClient) {}

  listTools(): Promise<ToolsListResponse> {
    return this.http.get<ToolsListResponse>("/api/v1/tools");
  }

  async executeTool(payload: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    try {
      return await this.http.post<ToolExecutionResponse, ToolExecutionRequest>("/api/v1/tools/execute", {
        body: payload,
      });
    } catch (error) {
      if (error instanceof ApiError && isToolExecutionResponse(error.details)) {
        return error.details;
      }
      throw error;
    }
  }
}
