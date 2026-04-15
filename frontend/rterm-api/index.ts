export { ApiError, parseApiError } from "./http/errors";
export type { NormalizedApiErrorOptions } from "./http/errors";
export { HttpClient } from "./http/client";
export type { HttpClientOptions } from "./http/client";
export type { ErrorPayload, HttpMethod, QueryParams, RawRequestOptions, JsonLike } from "./http/types";

export {
  buildTerminalStreamUrl,
  consumeTerminalStream,
  consumeTerminalStreamViaClient,
  type TerminalStreamEvents,
  type TerminalStreamPayload,
  type TerminalStreamUrlOptions,
} from "./http/sse";

export { AgentClient } from "./agent/client";
export type {
  AgentCatalog,
  AgentSelectionRequest,
  PolicyOverlay,
  PromptProfile,
  RolePreset,
  WorkMode,
} from "./agent/types";

export { BootstrapClient } from "./bootstrap/client";
export type { BootstrapResponse, HealthResponse } from "./bootstrap/types";

export { ConversationClient } from "./conversation/client";
export type {
  ConversationContext,
  ConversationMessage,
  ConversationSnapshot,
  ConversationSnapshotResponse,
  ExplainTerminalCommandRequest,
  ExplainTerminalCommandResponse,
  SubmitConversationMessageRequest,
  SubmitConversationMessageResponse,
} from "./conversation/types";

export { AuditClient } from "./audit/client";
export type { AuditEvent, AuditResponse } from "./audit/types";

export { ConnectionsClient } from "./connections/client";
export type {
  Connection,
  ConnectionKind,
  ConnectionStatus,
  ConnectionCheckStatus,
  ConnectionLaunchStatus,
  ConnectionUsability,
  ConnectionRuntimeState,
  SSHConfig,
  ConnectionsSnapshot,
  SelectConnectionRequest,
  SaveSSHConnectionRequest,
  SaveSSHConnectionResponse,
} from "./connections/types";

export { PolicyClient } from "./policy/client";
export type {
  IgnoreRule,
  IgnoreRulesResponse,
  PolicyEvaluationProfile,
  PolicyApprovalOverlay,
  PolicyCapabilityOverlay,
  RuleMatcherType,
  RuleScope,
  RuleSubjectType,
  StructuredMatcher,
  TrustedRule,
  TrustedRulesResponse,
} from "./policy/types";

export { ToolsClient } from "./tools/client";
export type {
  ToolErrorCode,
  ToolExecutionStatus,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolExecutionContext,
  ToolExecutionOutput,
  ToolMetadata,
  ToolInfo,
  ToolsListResponse,
  PendingApproval,
  ToolOperation,
} from "./tools/types";

export { TerminalClient } from "./terminal/client";
export type {
  SendInputRequest,
  SendInputResponse,
  TerminalState,
  TerminalOutputChunk,
  TerminalSnapshot,
} from "./terminal/types";
export type { TerminalStreamRequestOptions } from "./terminal/client";

export { WorkspaceClient } from "./workspace/client";
export type {
  Workspace,
  WorkspaceSnapshot,
  WorkspaceActionResponse,
  WorkspaceTab,
  WorkspaceWidget,
  WorkspaceWidgetKind,
  WorkspaceTabMutation,
  CreateTerminalTabRequest,
  CreateTerminalTabResponse,
  CloseTabResponse,
  FocusWidgetRequest,
  FocusTabRequest,
  MoveTabRequest,
  RenameTabRequest,
  SetTabPinnedRequest,
} from "./workspace/types";

import { AgentClient } from "./agent/client";
import { AuditClient } from "./audit/client";
import { BootstrapClient } from "./bootstrap/client";
import { ConnectionsClient } from "./connections/client";
import { ConversationClient } from "./conversation/client";
import { HttpClient } from "./http/client";
import { PolicyClient } from "./policy/client";
import { ToolsClient } from "./tools/client";
import { TerminalClient } from "./terminal/client";
import { WorkspaceClient } from "./workspace/client";

export interface RtermApiConfig {
  baseUrl: string;
  authToken?: string;
}

export class RtermApi {
  readonly agent: AgentClient;
  readonly audit: AuditClient;
  readonly bootstrap: BootstrapClient;
  readonly connections: ConnectionsClient;
  readonly conversation: ConversationClient;
  readonly policy: PolicyClient;
  readonly tools: ToolsClient;
  readonly terminal: TerminalClient;
  readonly workspace: WorkspaceClient;

  constructor(config: RtermApiConfig) {
    const http = new HttpClient(config);
    this.agent = new AgentClient(http);
    this.audit = new AuditClient(http);
    this.bootstrap = new BootstrapClient(http);
    this.connections = new ConnectionsClient(http);
    this.conversation = new ConversationClient(http);
    this.policy = new PolicyClient(http);
    this.tools = new ToolsClient(http);
    this.terminal = new TerminalClient(http);
    this.workspace = new WorkspaceClient(http);
  }
}
