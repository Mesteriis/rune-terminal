import type { MCPServersResponse } from "./types";
import { HttpClient } from "../http/client";

export class MCPClient {
  constructor(private readonly http: HttpClient) {}

  listServers(): Promise<MCPServersResponse> {
    return this.http.get<MCPServersResponse>("/api/v1/mcp/servers");
  }
}
