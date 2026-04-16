import type { BootstrapClient } from "@/rterm-api/bootstrap/client";
import type { BootstrapResponse } from "@/rterm-api/bootstrap/types";
import type { ToolsClient } from "@/rterm-api/tools/client";
import type {
  ToolExecutionContext,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolsListResponse,
} from "@/rterm-api/tools/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface ToolsFacade {
  listTools: () => Promise<ToolsListResponse>;
  getBootstrap: () => Promise<BootstrapResponse>;
  executeTool: (payload: ToolExecutionRequest) => Promise<ToolExecutionResponse>;
  confirmApproval: (approvalId: string, context?: ToolExecutionContext) => Promise<ToolExecutionResponse>;
}

let toolsFacadePromise: Promise<ToolsFacade> | null = null;

function buildToolsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ToolsFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createToolsFacade(clients.tools, clients.bootstrap);
  });
  facadePromise.catch(() => {
    toolsFacadePromise = null;
  });
  return facadePromise;
}

export function getToolsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ToolsFacade> {
  if (toolsFacadePromise == null) {
    toolsFacadePromise = buildToolsFacade(fetchImpl);
  }
  return toolsFacadePromise;
}

export function createToolsFacade(client: ToolsClient, bootstrapClient: BootstrapClient): ToolsFacade {
  return {
    listTools(): Promise<ToolsListResponse> {
      return client.listTools();
    },
    getBootstrap(): Promise<BootstrapResponse> {
      return bootstrapClient.getBootstrap();
    },
    executeTool(payload: ToolExecutionRequest): Promise<ToolExecutionResponse> {
      return client.executeTool(payload);
    },
    confirmApproval(approvalId: string, context?: ToolExecutionContext): Promise<ToolExecutionResponse> {
      return client.confirmApproval(approvalId, context);
    },
  };
}
