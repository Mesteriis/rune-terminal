import type { AgentClient } from "@/rterm-api/agent/client";
import type { AgentCatalog, AgentSelectionRequest } from "@/rterm-api/agent/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface AgentFacade {
  getCatalog: () => Promise<AgentCatalog>;
  setActiveProfile: (payload: AgentSelectionRequest) => Promise<AgentCatalog>;
  setActiveRole: (payload: AgentSelectionRequest) => Promise<AgentCatalog>;
  setActiveMode: (payload: AgentSelectionRequest) => Promise<AgentCatalog>;
}

let agentFacadePromise: Promise<AgentFacade> | null = null;

function buildAgentFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<AgentFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createAgentFacade(clients.agent);
  });
  facadePromise.catch(() => {
    agentFacadePromise = null;
  });
  return facadePromise;
}

export function getAgentFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<AgentFacade> {
  if (agentFacadePromise == null) {
    agentFacadePromise = buildAgentFacade(fetchImpl);
  }
  return agentFacadePromise;
}

export function createAgentFacade(client: AgentClient): AgentFacade {
  return {
    getCatalog(): Promise<AgentCatalog> {
      return client.getCatalog();
    },
    setActiveProfile(payload: AgentSelectionRequest): Promise<AgentCatalog> {
      return client.setActiveProfile(payload);
    },
    setActiveRole(payload: AgentSelectionRequest): Promise<AgentCatalog> {
      return client.setActiveRole(payload);
    },
    setActiveMode(payload: AgentSelectionRequest): Promise<AgentCatalog> {
      return client.setActiveMode(payload);
    },
  };
}
