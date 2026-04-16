import type {
  MCPInvokeRequest,
  MCPInvokeResponse,
  MCPRegisterServerRequest,
  MCPServerMutationResponse,
  MCPServersResponse,
} from "./types";
import { HttpClient } from "../http/client";

export class MCPClient {
  constructor(private readonly http: HttpClient) {}

  listServers(): Promise<MCPServersResponse> {
    return this.http.get<MCPServersResponse>("/api/v1/mcp/servers");
  }

  registerServer(payload: MCPRegisterServerRequest): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse, MCPRegisterServerRequest>("/api/v1/mcp/servers", {
      body: payload,
    });
  }

  startServer(serverID: string): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse>(`/api/v1/mcp/servers/${encodeURIComponent(serverID)}/start`);
  }

  stopServer(serverID: string): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse>(`/api/v1/mcp/servers/${encodeURIComponent(serverID)}/stop`);
  }

  restartServer(serverID: string): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse>(`/api/v1/mcp/servers/${encodeURIComponent(serverID)}/restart`);
  }

  enableServer(serverID: string): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse>(`/api/v1/mcp/servers/${encodeURIComponent(serverID)}/enable`);
  }

  disableServer(serverID: string): Promise<MCPServerMutationResponse> {
    return this.http.post<MCPServerMutationResponse>(`/api/v1/mcp/servers/${encodeURIComponent(serverID)}/disable`);
  }

  invoke(payload: MCPInvokeRequest): Promise<MCPInvokeResponse> {
    return this.http.post<MCPInvokeResponse, MCPInvokeRequest>("/api/v1/mcp/invoke", {
      body: payload,
    });
  }
}
