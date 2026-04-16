export type MCPServerState = "stopped" | "starting" | "active" | "idle" | "stopped_auto";

export interface MCPServerRuntime {
  id: string;
  state: MCPServerState;
  last_used?: string;
  active: boolean;
}

export interface MCPServersResponse {
  servers: MCPServerRuntime[];
}
