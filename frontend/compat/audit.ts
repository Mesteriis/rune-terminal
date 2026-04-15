import type { AuditClient } from "@/rterm-api/audit/client";
import type { AuditResponse } from "@/rterm-api/audit/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface AuditFacade {
  getEvents: (limit?: number) => Promise<AuditResponse>;
}

let auditFacadePromise: Promise<AuditFacade> | null = null;

function buildAuditFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<AuditFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createAuditFacade(clients.audit);
  });
  facadePromise.catch(() => {
    auditFacadePromise = null;
  });
  return facadePromise;
}

export function getAuditFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<AuditFacade> {
  if (auditFacadePromise == null) {
    auditFacadePromise = buildAuditFacade(fetchImpl);
  }
  return auditFacadePromise;
}

export function createAuditFacade(client: AuditClient): AuditFacade {
  return {
    getEvents(limit = 50): Promise<AuditResponse> {
      return client.getEvents(limit);
    },
  };
}
