import { HttpClient } from "@/rterm-api/http/client";
import { AgentClient } from "@/rterm-api/agent/client";
import { AuditClient } from "@/rterm-api/audit/client";
import { BootstrapClient } from "@/rterm-api/bootstrap/client";
import { ConnectionsClient } from "@/rterm-api/connections/client";
import { ConversationClient } from "@/rterm-api/conversation/client";
import { PolicyClient } from "@/rterm-api/policy/client";
import { ToolsClient } from "@/rterm-api/tools/client";
import { TerminalClient } from "@/rterm-api/terminal/client";
import { WorkspaceClient } from "@/rterm-api/workspace/client";
import { resolveRuntimeConfig } from "@/runtime";
import type { RuntimeConfig } from "@/runtime/types";
import type { CompatApiFacade, CompatApiOptions } from "./types";

function buildTypedClients(fetchImpl: CompatApiOptions["fetchImpl"], baseUrl: string, authToken: string | undefined) {
  const http = new HttpClient(
    {
      baseUrl,
      authToken,
    },
    fetchImpl
  );

  return {
    http,
    clients: {
      agent: new AgentClient(http),
      audit: new AuditClient(http),
      bootstrap: new BootstrapClient(http),
      connections: new ConnectionsClient(http),
      conversation: new ConversationClient(http),
      policy: new PolicyClient(http),
      tools: new ToolsClient(http),
      terminal: new TerminalClient(http),
      workspace: new WorkspaceClient(http),
    },
  };
}

export async function createCompatApiFacade(options: CompatApiOptions = {}): Promise<CompatApiFacade> {
  const runtime = options.runtime ?? (await resolveRuntimeConfig());
  const { http, clients } = buildTypedClients(options.fetchImpl, runtime.baseUrl, runtime.authToken);

  return {
    runtime,
    http,
    clients: {
      ...clients,
      bootstrap: new BootstrapClient(http, {
        noAuthForHealth: options.noAuthForHealth === true,
      }),
    },
  };
}

export function createCompatApiFacadeFromRuntime(
  runtime: RuntimeConfig,
  options: Omit<CompatApiOptions, "runtime"> = {},
): CompatApiFacade {
  const { http, clients } = buildTypedClients(options.fetchImpl, runtime.baseUrl, runtime.authToken);

  return {
    runtime,
    http,
    clients: {
      ...clients,
      bootstrap: new BootstrapClient(http, {
        noAuthForHealth: options.noAuthForHealth === true,
      }),
    },
  };
}

export type { CompatApiClients } from "./types";
export { type CompatApiFacade, type CompatApiOptions } from "./types";
