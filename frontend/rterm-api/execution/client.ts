import { HttpClient } from "../http/client";
import type { ExecutionBlockResponse, ExecutionBlocksListResponse } from "./types";

export interface ListExecutionBlocksRequest {
  workspace_id?: string;
  limit?: number;
}

export class ExecutionClient {
  constructor(private readonly http: HttpClient) {}

  listBlocks(request: ListExecutionBlocksRequest = {}): Promise<ExecutionBlocksListResponse> {
    return this.http.get<ExecutionBlocksListResponse>("/api/v1/execution/blocks", {
      query: {
        workspace_id: request.workspace_id,
        limit: request.limit,
      },
    });
  }

  getBlock(blockID: string): Promise<ExecutionBlockResponse> {
    return this.http.get<ExecutionBlockResponse>(`/api/v1/execution/blocks/${encodeURIComponent(blockID)}`);
  }
}

