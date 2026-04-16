import type {
  CreateRemoteSessionFromProfileRequest,
  CreateRemoteSessionFromProfileResponse,
  DeleteRemoteProfileResponse,
  ListRemoteProfilesResponse,
  ConnectionsSnapshot,
  SaveRemoteProfileRequest,
  SaveRemoteProfileResponse,
  SelectConnectionRequest,
  SaveSSHConnectionRequest,
  SaveSSHConnectionResponse,
} from "./types";
import { HttpClient } from "../http/client";

export class ConnectionsClient {
  constructor(private readonly http: HttpClient) {}

  getConnections(): Promise<ConnectionsSnapshot> {
    return this.http.get<ConnectionsSnapshot>("/api/v1/connections");
  }

  checkConnection(connectionID: string): Promise<SaveSSHConnectionResponse> {
    return this.http.post<SaveSSHConnectionResponse>(
      `/api/v1/connections/${encodeURIComponent(connectionID)}/check`,
    );
  }

  selectConnection(payload: SelectConnectionRequest): Promise<ConnectionsSnapshot> {
    return this.http.put<ConnectionsSnapshot, SelectConnectionRequest>("/api/v1/connections/active", {
      body: payload,
    });
  }

  saveSSHConnection(payload: SaveSSHConnectionRequest): Promise<SaveSSHConnectionResponse> {
    return this.http.post<SaveSSHConnectionResponse, SaveSSHConnectionRequest>("/api/v1/connections/ssh", {
      body: payload,
    });
  }

  listRemoteProfiles(): Promise<ListRemoteProfilesResponse> {
    return this.http.get<ListRemoteProfilesResponse>("/api/v1/remote/profiles");
  }

  saveRemoteProfile(payload: SaveRemoteProfileRequest): Promise<SaveRemoteProfileResponse> {
    return this.http.post<SaveRemoteProfileResponse, SaveRemoteProfileRequest>("/api/v1/remote/profiles", {
      body: payload,
    });
  }

  deleteRemoteProfile(profileID: string): Promise<DeleteRemoteProfileResponse> {
    return this.http.delete<DeleteRemoteProfileResponse>(`/api/v1/remote/profiles/${encodeURIComponent(profileID)}`);
  }

  createSessionFromRemoteProfile(
    profileID: string,
    payload: CreateRemoteSessionFromProfileRequest = {},
  ): Promise<CreateRemoteSessionFromProfileResponse> {
    return this.http.post<CreateRemoteSessionFromProfileResponse, CreateRemoteSessionFromProfileRequest>(
      `/api/v1/remote/profiles/${encodeURIComponent(profileID)}/session`,
      { body: payload },
    );
  }
}
