import type { ExecutionClient } from "@/rterm-api/execution/client";
import type { ExecutionBlock, ExecutionBlockResponse, ExecutionBlocksListResponse } from "@/rterm-api/execution/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface ExecutionFacade {
  listBlocks: (workspaceID?: string, limit?: number) => Promise<ExecutionBlocksListResponse>;
  getBlock: (blockID: string) => Promise<ExecutionBlockResponse>;
}

let executionFacadePromise: Promise<ExecutionFacade> | null = null;

function buildExecutionFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ExecutionFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createExecutionFacade(clients.execution);
  });
  facadePromise.catch(() => {
    executionFacadePromise = null;
  });
  return facadePromise;
}

export function getExecutionFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ExecutionFacade> {
  if (executionFacadePromise == null) {
    executionFacadePromise = buildExecutionFacade(fetchImpl);
  }
  return executionFacadePromise;
}

export function createExecutionFacade(client: ExecutionClient): ExecutionFacade {
  return {
    listBlocks(workspaceID?: string, limit = 20): Promise<ExecutionBlocksListResponse> {
      return client.listBlocks({
        workspace_id: workspaceID,
        limit,
      });
    },
    getBlock(blockID: string): Promise<ExecutionBlockResponse> {
      return client.getBlock(blockID);
    },
  };
}

export type { ExecutionBlock };

