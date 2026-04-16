import type { MCPClient } from "@/rterm-api/mcp/client";
import type { MCPInvokeRequest, MCPInvokeResponse, MCPServerRuntime } from "@/rterm-api/mcp/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface MCPFacade {
  listServers: () => Promise<MCPServerRuntime[]>;
  startServer: (serverID: string) => Promise<MCPServerRuntime>;
  stopServer: (serverID: string) => Promise<MCPServerRuntime>;
  restartServer: (serverID: string) => Promise<MCPServerRuntime>;
  enableServer: (serverID: string) => Promise<MCPServerRuntime>;
  disableServer: (serverID: string) => Promise<MCPServerRuntime>;
  invoke: (payload: MCPInvokeRequest) => Promise<MCPInvokeResponse>;
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
    async startServer(serverID: string): Promise<MCPServerRuntime> {
      const response = await client.startServer(serverID);
      return response.server;
    },
    async stopServer(serverID: string): Promise<MCPServerRuntime> {
      const response = await client.stopServer(serverID);
      return response.server;
    },
    async restartServer(serverID: string): Promise<MCPServerRuntime> {
      const response = await client.restartServer(serverID);
      return response.server;
    },
    async enableServer(serverID: string): Promise<MCPServerRuntime> {
      const response = await client.enableServer(serverID);
      return response.server;
    },
    async disableServer(serverID: string): Promise<MCPServerRuntime> {
      const response = await client.disableServer(serverID);
      return response.server;
    },
    invoke(payload: MCPInvokeRequest): Promise<MCPInvokeResponse> {
      return client.invoke({
        ...payload,
        include_context: true,
      });
    },
  };
}
