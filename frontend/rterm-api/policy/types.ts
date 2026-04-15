export type RuleScope = "global" | "workspace" | "repo" | (string & {});

export type RuleSubjectType = "tool" | "command" | "path" | (string & {});

export type RuleMatcherType = "exact" | "glob" | "regex" | "structured" | (string & {});

export interface StructuredMatcher {
  tool_names?: string[];
  widget_ids?: string[];
  summary_contains?: string[];
}

export interface PolicyCapabilityOverlay {
  additions?: string[];
  removals?: string[];
}

export interface PolicyApprovalOverlay {
  escalate_by?: number;
  minimum_mutation_tier?: string;
}

export interface PolicyEvaluationProfile {
  prompt_profile_id?: string;
  role_id?: string;
  mode_id?: string;
  security_posture?: string;
  capability_overlay?: PolicyCapabilityOverlay;
  approval_overlay?: PolicyApprovalOverlay;
  disable_trusted_auto_approve?: boolean;
}

export interface TrustedRule {
  id: string;
  scope: RuleScope;
  scope_ref?: string;
  subject_type: RuleSubjectType;
  matcher_type: RuleMatcherType;
  matcher?: string;
  structured?: StructuredMatcher;
  created_at: string;
  note?: string;
  enabled: boolean;
}

export interface IgnoreRule {
  id: string;
  scope: RuleScope;
  scope_ref?: string;
  matcher_type: RuleMatcherType;
  pattern: string;
  mode: "deny" | "metadata-only" | "redact";
  created_at: string;
  note?: string;
  enabled: boolean;
}

export interface TrustedRulesResponse {
  rules: TrustedRule[];
}

export interface IgnoreRulesResponse {
  rules: IgnoreRule[];
}
