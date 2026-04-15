import type { WorkspaceSnapshot } from "../workspace/types";
import type { ConnectionsSnapshot } from "../connections/types";
import type { ToolInfo } from "../tools/types";

export interface HealthResponse {
  status: string;
}

export interface BootstrapResponse {
  product_name: string;
  workspace: WorkspaceSnapshot;
  connections: ConnectionsSnapshot;
  tools: ToolInfo[];
  repo_root: string;
}
