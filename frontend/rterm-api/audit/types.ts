export interface AuditEvent {
  id: string;
  tool_name: string;
  summary?: string;
  workspace_id?: string;
  prompt_profile_id?: string;
  role_id?: string;
  mode_id?: string;
  security_posture?: string;
  approval_tier?: string;
  effective_approval_tier?: string;
  trusted_rule_id?: string;
  ignore_rule_id?: string;
  ignore_mode?: string;
  success: boolean;
  error?: string;
  timestamp: string;
  approval_used?: boolean;
  affected_paths?: string[];
  affected_widgets?: string[];
}

export interface AuditResponse {
  events: AuditEvent[];
}
