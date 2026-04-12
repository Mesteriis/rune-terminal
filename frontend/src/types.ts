export type Widget = {
  id: string
  kind: string
  title: string
  description?: string
  terminal_id?: string
}

export type Workspace = {
  id: string
  name: string
  widgets: Widget[]
  active_widget_id: string
}

export type TerminalState = {
  widget_id: string
  session_id: string
  shell: string
  pid: number
  status: string
  started_at: string
  last_output_at?: string
  exit_code?: number
  can_send_input: boolean
  can_interrupt: boolean
  working_dir?: string
}

export type OutputChunk = {
  seq: number
  data: string
  timestamp: string
}

export type ToolInfo = {
  name: string
  description: string
  input_schema: unknown
  output_schema: unknown
  metadata: {
    capabilities: string[]
    approval_tier: string
    mutating: boolean
    target_kind: string
  }
}

export type PendingApproval = {
  id: string
  tool_name: string
  summary: string
  approval_tier: string
  created_at: string
  expires_at: string
}

export type ApprovalGrant = {
  approval_id: string
  approval_token: string
  expires_at: string
}

export type Operation = {
  summary: string
  affected_paths?: string[]
  affected_widgets?: string[]
  required_capabilities?: string[]
  approval_tier?: string
}

export type ExecuteToolRequest = {
  tool_name: string
  input?: Record<string, unknown>
  approval_token?: string
  context?: {
    workspace_id?: string
    repo_root?: string
    active_widget_id?: string
  }
}

export type ExecuteToolResponse = {
  status: 'ok' | 'error' | 'requires_confirmation'
  output?: unknown
  error?: string
  tool?: ToolInfo
  operation?: Operation
  pending_approval?: PendingApproval
}

export type TrustedRule = {
  id: string
  scope: string
  scope_ref?: string
  subject_type: string
  matcher_type: string
  matcher?: string
  structured?: Record<string, unknown>
  note?: string
  enabled: boolean
  created_at: string
}

export type IgnoreRule = {
  id: string
  scope: string
  scope_ref?: string
  matcher_type: string
  pattern: string
  mode: string
  note?: string
  enabled: boolean
  created_at: string
}

export type AuditEvent = {
  id: string
  tool_name: string
  summary?: string
  workspace_id?: string
  prompt_profile_id?: string
  role_id?: string
  mode_id?: string
  security_posture?: string
  approval_tier?: string
  effective_approval_tier?: string
  trusted_rule_id?: string
  ignore_rule_id?: string
  ignore_mode?: string
  success: boolean
  error?: string
  timestamp: string
  approval_used?: boolean
  affected_paths?: string[]
  affected_widgets?: string[]
}

export type BootstrapPayload = {
  product_name: string
  workspace: Workspace
  tools: ToolInfo[]
  repo_root: string
}
