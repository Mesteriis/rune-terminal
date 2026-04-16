import type {
  ApprovalGrant,
  ToolExecutionContext,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolsListResponse,
} from "./types";
import { ApiError } from "../http/errors";
import { HttpClient } from "../http/client";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isToolExecutionResponse(value: unknown): value is ToolExecutionResponse {
  return isObject(value) && typeof value.status === "string";
}

export function getApprovalGrant(response: ToolExecutionResponse): ApprovalGrant | null {
  const output = response.output;
  if (!isObject(output)) {
    return null;
  }
  const approvalID = output.approval_id;
  const approvalToken = output.approval_token;
  const expiresAt = output.expires_at;
  if (typeof approvalID !== "string" || typeof approvalToken !== "string" || typeof expiresAt !== "string") {
    return null;
  }
  return {
    approval_id: approvalID,
    approval_token: approvalToken,
    expires_at: expiresAt,
  };
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

  confirmApproval(approvalId: string, context?: ToolExecutionContext): Promise<ToolExecutionResponse> {
    return this.executeTool({
      tool_name: "safety.confirm",
      input: { approval_id: approvalId },
      context,
    });
  }
}
