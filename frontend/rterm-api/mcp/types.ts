export type MCPServerState = "stopped" | "starting" | "active" | "idle" | "stopped_auto";

export interface MCPServerRuntime {
  id: string;
  state: MCPServerState;
  last_used?: string;
  active: boolean;
  enabled: boolean;
}

export interface MCPServersResponse {
  servers: MCPServerRuntime[];
}

export interface MCPServerMutationResponse {
  server: MCPServerRuntime;
}

export interface MCPInvokeRequest {
  server_id: string;
  payload?: Record<string, unknown>;
  allow_on_demand_start?: boolean;
  include_context?: boolean;
}

export interface MCPContextPayload {
  included: boolean;
  truncated: boolean;
  original_bytes: number;
  payload?: unknown;
}

export interface MCPInvokeResponse {
  server_id: string;
  output?: unknown;
  context?: MCPContextPayload;
}
