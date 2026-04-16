import type { FSClient } from "@/rterm-api/fs/client";
import type { FSListResponse, FSReadResponse } from "@/rterm-api/fs/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface FSFacade {
  list: (path?: string) => Promise<FSListResponse>;
  read: (path: string, maxBytes?: number) => Promise<FSReadResponse>;
}

let fsFacadePromise: Promise<FSFacade> | null = null;

function buildFSFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<FSFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createFSFacade(clients.fs);
  });
  facadePromise.catch(() => {
    fsFacadePromise = null;
  });
  return facadePromise;
}

export function getFSFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<FSFacade> {
  if (fsFacadePromise == null) {
    fsFacadePromise = buildFSFacade(fetchImpl);
  }
  return fsFacadePromise;
}

export function createFSFacade(client: FSClient): FSFacade {
  return {
    list(path?: string): Promise<FSListResponse> {
      return client.list(path);
    },
    read(path: string, maxBytes?: number): Promise<FSReadResponse> {
      return client.read(path, maxBytes);
    },
  };
}
