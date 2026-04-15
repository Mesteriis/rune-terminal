import type { BootstrapResponse, HealthResponse } from "./types";
import type { WorkspaceSnapshot } from "../workspace/types";
import { HttpClient } from "../http/client";

export interface BootstrapClientOptions {
  noAuthForHealth?: boolean;
}

export class BootstrapClient {
  constructor(private readonly http: HttpClient, private readonly options: BootstrapClientOptions = {}) {}

  getBootstrap(): Promise<BootstrapResponse> {
    return this.http.get<BootstrapResponse>("/api/v1/bootstrap");
  }

  getWorkspace(): Promise<WorkspaceSnapshot> {
    return this.http.get<WorkspaceSnapshot>("/api/v1/workspace");
  }

  getHealth(): Promise<HealthResponse> {
    return this.http.get<HealthResponse>("/healthz", {
      includeAuth: !this.options.noAuthForHealth,
    });
  }
}
