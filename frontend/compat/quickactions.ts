import type { QuickActionsClient } from "@/rterm-api/quickactions/client";
import type { QuickAction } from "@/rterm-api/quickactions/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface QuickActionsFacade {
  listQuickActions: () => Promise<QuickAction[]>;
}

let quickActionsFacadePromise: Promise<QuickActionsFacade> | null = null;

function buildQuickActionsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<QuickActionsFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createQuickActionsFacade(clients.quickactions);
  });
  facadePromise.catch(() => {
    quickActionsFacadePromise = null;
  });
  return facadePromise;
}

export function getQuickActionsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<QuickActionsFacade> {
  if (quickActionsFacadePromise == null) {
    quickActionsFacadePromise = buildQuickActionsFacade(fetchImpl);
  }
  return quickActionsFacadePromise;
}

export function createQuickActionsFacade(client: QuickActionsClient): QuickActionsFacade {
  return {
    async listQuickActions(): Promise<QuickAction[]> {
      const response = await client.listQuickActions();
      return response.actions ?? [];
    },
  };
}
