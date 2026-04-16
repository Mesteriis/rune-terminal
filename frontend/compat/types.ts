import type { RuntimeConfig } from "@/runtime/types";
import type { HttpClient } from "@/rterm-api/http/client";
import type { AgentClient } from "@/rterm-api/agent/client";
import type { AuditClient } from "@/rterm-api/audit/client";
import type { BootstrapClient } from "@/rterm-api/bootstrap/client";
import type { ConnectionsClient } from "@/rterm-api/connections/client";
import type { ConversationClient } from "@/rterm-api/conversation/client";
import type { FSClient } from "@/rterm-api/fs/client";
import type { MCPClient } from "@/rterm-api/mcp/client";
import type { PolicyClient } from "@/rterm-api/policy/client";
import type { ToolsClient } from "@/rterm-api/tools/client";
import type { TerminalClient } from "@/rterm-api/terminal/client";
import type { WorkspaceClient } from "@/rterm-api/workspace/client";

export type CompatFetchImpl = typeof fetch;

export interface CompatApiFacade {
  runtime: RuntimeConfig;
  http: HttpClient;
  clients: CompatApiClients;
}

export interface CompatApiClients {
  agent: AgentClient;
  audit: AuditClient;
  bootstrap: BootstrapClient;
  connections: ConnectionsClient;
  conversation: ConversationClient;
  fs: FSClient;
  mcp: MCPClient;
  policy: PolicyClient;
  tools: ToolsClient;
  terminal: TerminalClient;
  workspace: WorkspaceClient;
}

export interface CompatApiOptions {
  runtime?: RuntimeConfig;
  fetchImpl?: CompatFetchImpl;
  noAuthForHealth?: boolean;
}
