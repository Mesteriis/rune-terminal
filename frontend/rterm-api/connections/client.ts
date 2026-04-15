import type {
  ConnectionsSnapshot,
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
}
