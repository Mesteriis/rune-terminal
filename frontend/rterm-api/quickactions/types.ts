export type QuickActionTargetKind = "local" | "remote" | "workspace" | "mcp" | "tool" | "ui";
export type QuickActionExecutionKind = "execution_bearing" | "ui_only";

export interface QuickAction {
  id: string;
  label: string;
  category: string;
  target_kind: QuickActionTargetKind;
  invocation_path: string;
  requires_explicit_context: boolean;
  context_requirement?: string;
  execution_kind: QuickActionExecutionKind;
}

export interface QuickActionsResponse {
  actions: QuickAction[];
}
