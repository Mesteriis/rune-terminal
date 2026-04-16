import type { MCPClient } from "@/rterm-api/mcp/client";
import type { MCPServerRuntime } from "@/rterm-api/mcp/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface MCPFacade {
  listServers: () => Promise<MCPServerRuntime[]>;
}

let mcpFacadePromise: Promise<MCPFacade> | null = null;

function buildMCPFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<MCPFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createMCPFacade(clients.mcp);
  });
  facadePromise.catch(() => {
    mcpFacadePromise = null;
  });
  return facadePromise;
}

export function getMCPFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<MCPFacade> {
  if (mcpFacadePromise == null) {
    mcpFacadePromise = buildMCPFacade(fetchImpl);
  }
  return mcpFacadePromise;
}

export function createMCPFacade(client: MCPClient): MCPFacade {
  return {
    async listServers(): Promise<MCPServerRuntime[]> {
      const response = await client.listServers();
      return response.servers ?? [];
    },
  };
}
