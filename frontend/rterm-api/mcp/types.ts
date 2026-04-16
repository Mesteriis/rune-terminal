export type MCPServerState = "stopped" | "starting" | "active" | "idle" | "stopped_auto";
export type MCPServerType = "process" | "remote";

export interface MCPServerRuntime {
  id: string;
  type: MCPServerType;
  endpoint?: string;
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

export interface MCPRegisterServerRequest {
  id: string;
  type: "remote";
  endpoint: string;
  headers?: Record<string, string>;
}

export interface MCPInvokeRequest {
  server_id: string;
  payload?: Record<string, unknown>;
  allow_on_demand_start?: boolean;
  include_context?: boolean;
  action_source?: string;
  workspace_id?: string;
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
