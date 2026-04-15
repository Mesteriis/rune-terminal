export interface PolicyOverlay {
  capability_additions?: string[];
  capability_removals?: string[];
  minimum_mutation_tier?: string;
  escalate_approval_by?: number;
  disable_trusted_auto_approve?: boolean;
  security_posture?: string;
}

export interface PromptProfile {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  overlay: PolicyOverlay;
}

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  overlay: PolicyOverlay;
}

export interface WorkMode {
  id: string;
  name: string;
  description: string;
  prompt: string;
  overlay: PolicyOverlay;
}

export interface AgentSelection {
  profile: PromptProfile;
  role: RolePreset;
  mode: WorkMode;
  effective_prompt: string;
  effective_policy_profile: {
    prompt_profile_id?: string;
    role_id?: string;
    mode_id?: string;
    security_posture?: string;
    capability_overlay?: {
      additions?: string[];
      removals?: string[];
    };
    approval_overlay?: {
      escalate_by?: number;
      minimum_mutation_tier?: string;
    };
    disable_trusted_auto_approve?: boolean;
  };
}

export interface AgentCatalog {
  profiles: PromptProfile[];
  roles: RolePreset[];
  modes: WorkMode[];
  active: AgentSelection;
}

export interface AgentSelectionRequest {
  id: string;
}
