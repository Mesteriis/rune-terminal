export type ToolErrorCode =
  | "invalid_input"
  | "not_found"
  | "policy_denied"
  | "approval_required"
  | "approval_mismatch"
  | "internal_error"
  | (string & {});

export type ToolExecutionStatus = "ok" | "requires_confirmation" | "error" | (string & {});

export interface ToolMetadata {
  capabilities: string[];
  approval_tier: string;
  mutating: boolean;
  target_kind: string;
}

export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  metadata: ToolMetadata;
}

export interface ToolsListResponse {
  tools: ToolInfo[];
}

export interface ToolExecutionContext {
  workspace_id?: string;
  repo_root?: string;
  active_widget_id?: string;
  target_session?: string;
  target_connection_id?: string;
}

export interface ToolExecutionRequest {
  tool_name: string;
  input?: unknown;
  context?: ToolExecutionContext;
  approval_token?: string;
}

export interface ToolExecutionOutput {
  [key: string]: unknown;
}

export interface ApprovalGrant {
  approval_id: string;
  approval_token: string;
  expires_at: string;
}

export interface PendingApproval {
  id: string;
  tool_name: string;
  summary: string;
  approval_tier: string;
  created_at: string;
  expires_at: string;
}

export interface ToolOperation {
  summary: string;
  affected_paths?: string[];
  affected_widgets?: string[];
  required_capabilities?: string[];
  approval_tier?: string;
}

export interface ToolExecutionResponse {
  status: ToolExecutionStatus;
  output?: ToolExecutionOutput;
  error?: string;
  error_code?: ToolErrorCode;
  tool?: ToolInfo;
  operation?: ToolOperation;
  pending_approval?: PendingApproval;
}
