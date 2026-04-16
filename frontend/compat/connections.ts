import type { ConnectionsClient } from "@/rterm-api/connections/client";
import type {
  CreateRemoteSessionFromProfileRequest,
  DeleteRemoteProfileResponse,
  ListRemoteProfilesResponse,
  SaveRemoteProfileRequest,
  SaveRemoteProfileResponse,
} from "@/rterm-api/connections/types";
import type { CreateTerminalTabResponse } from "@/rterm-api/workspace/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface ConnectionsFacade {
  listRemoteProfiles: () => Promise<ListRemoteProfilesResponse>;
  saveRemoteProfile: (payload: SaveRemoteProfileRequest) => Promise<SaveRemoteProfileResponse>;
  deleteRemoteProfile: (profileID: string) => Promise<DeleteRemoteProfileResponse>;
  createSessionFromRemoteProfile: (
    profileID: string,
    payload?: CreateRemoteSessionFromProfileRequest,
  ) => Promise<CreateTerminalTabResponse>;
}

let connectionsFacadePromise: Promise<ConnectionsFacade> | null = null;

function buildConnectionsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ConnectionsFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createConnectionsFacade(clients.connections);
  });
  facadePromise.catch(() => {
    connectionsFacadePromise = null;
  });
  return facadePromise;
}

export function getConnectionsFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ConnectionsFacade> {
  if (connectionsFacadePromise == null) {
    connectionsFacadePromise = buildConnectionsFacade(fetchImpl);
  }
  return connectionsFacadePromise;
}

export function createConnectionsFacade(client: ConnectionsClient): ConnectionsFacade {
  return {
    listRemoteProfiles(): Promise<ListRemoteProfilesResponse> {
      return client.listRemoteProfiles();
    },
    saveRemoteProfile(payload: SaveRemoteProfileRequest): Promise<SaveRemoteProfileResponse> {
      return client.saveRemoteProfile(payload);
    },
    deleteRemoteProfile(profileID: string): Promise<DeleteRemoteProfileResponse> {
      return client.deleteRemoteProfile(profileID);
    },
    createSessionFromRemoteProfile(
      profileID: string,
      payload: CreateRemoteSessionFromProfileRequest = {},
    ): Promise<CreateTerminalTabResponse> {
      return client.createSessionFromRemoteProfile(profileID, payload);
    },
  };
}
