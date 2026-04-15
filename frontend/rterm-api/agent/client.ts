import type { AgentCatalog, AgentSelectionRequest } from "./types";
import { HttpClient } from "../http/client";

export class AgentClient {
  constructor(private readonly http: HttpClient) {}

  getCatalog(): Promise<AgentCatalog> {
    return this.http.get<AgentCatalog>("/api/v1/agent");
  }

  setActiveProfile(payload: AgentSelectionRequest): Promise<AgentCatalog> {
    return this.http.put<AgentCatalog, AgentSelectionRequest>("/api/v1/agent/selection/profile", {
      body: payload,
    });
  }

  setActiveRole(payload: AgentSelectionRequest): Promise<AgentCatalog> {
    return this.http.put<AgentCatalog, AgentSelectionRequest>("/api/v1/agent/selection/role", {
      body: payload,
    });
  }

  setActiveMode(payload: AgentSelectionRequest): Promise<AgentCatalog> {
    return this.http.put<AgentCatalog, AgentSelectionRequest>("/api/v1/agent/selection/mode", {
      body: payload,
    });
  }
}
