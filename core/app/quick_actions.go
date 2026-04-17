package app

type QuickActionTargetKind string

const (
	QuickActionTargetLocal     QuickActionTargetKind = "local"
	QuickActionTargetRemote    QuickActionTargetKind = "remote"
	QuickActionTargetWorkspace QuickActionTargetKind = "workspace"
	QuickActionTargetMCP       QuickActionTargetKind = "mcp"
	QuickActionTargetTool      QuickActionTargetKind = "tool"
	QuickActionTargetUI        QuickActionTargetKind = "ui"
)

type QuickActionExecutionKind string

const (
	QuickActionExecutionBearing QuickActionExecutionKind = "execution_bearing"
	QuickActionUIOnly           QuickActionExecutionKind = "ui_only"
)

type QuickAction struct {
	ID                      string                   `json:"id"`
	Label                   string                   `json:"label"`
	Category                string                   `json:"category"`
	TargetKind              QuickActionTargetKind    `json:"target_kind"`
	InvocationPath          string                   `json:"invocation_path"`
	RequiresExplicitContext bool                     `json:"requires_explicit_context"`
	ContextRequirement      string                   `json:"context_requirement,omitempty"`
	ExecutionKind           QuickActionExecutionKind `json:"execution_kind"`
}

var quickActionCatalog = []QuickAction{
	{
		ID:             "ui.open_ai_panel",
		Label:          "Open AI Panel",
		Category:       "ui",
		TargetKind:     QuickActionTargetUI,
		InvocationPath: "frontend.workspace.layout.set_ai_visible",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "ui.open_tools_panel",
		Label:          "Open Tools Panel",
		Category:       "ui",
		TargetKind:     QuickActionTargetUI,
		InvocationPath: "frontend.workspace.widgets.open_tools",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "ui.open_audit_panel",
		Label:          "Open Audit Panel",
		Category:       "ui",
		TargetKind:     QuickActionTargetUI,
		InvocationPath: "frontend.workspace.widgets.open_audit",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "ui.open_files_panel",
		Label:          "Open Files Panel",
		Category:       "ui",
		TargetKind:     QuickActionTargetUI,
		InvocationPath: "frontend.workspace.widgets.open_files",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "mcp.open_controls",
		Label:          "Open MCP Controls",
		Category:       "mcp",
		TargetKind:     QuickActionTargetMCP,
		InvocationPath: "frontend.workspace.widgets.open_tools_mcp",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "remote.open_profiles",
		Label:          "Open Remote Profiles",
		Category:       "remote",
		TargetKind:     QuickActionTargetRemote,
		InvocationPath: "frontend.modals.remote_profiles.open",
		ExecutionKind:  QuickActionUIOnly,
	},
	{
		ID:             "workspace.create_local_terminal_tab",
		Label:          "Create Local Terminal Tab",
		Category:       "workspace",
		TargetKind:     QuickActionTargetWorkspace,
		InvocationPath: "POST /api/v1/workspace/tabs",
		ExecutionKind:  QuickActionExecutionBearing,
	},
	{
		ID:             "workspace.layout.split",
		Label:          "Switch Layout To Split",
		Category:       "workspace",
		TargetKind:     QuickActionTargetWorkspace,
		InvocationPath: "PATCH /api/v1/workspace/layout",
		ExecutionKind:  QuickActionExecutionBearing,
	},
	{
		ID:             "workspace.layout.focus",
		Label:          "Switch Layout To Focus",
		Category:       "workspace",
		TargetKind:     QuickActionTargetWorkspace,
		InvocationPath: "PATCH /api/v1/workspace/layout",
		ExecutionKind:  QuickActionExecutionBearing,
	},
	{
		ID:             "workspace.layout.save",
		Label:          "Save Current Layout",
		Category:       "workspace",
		TargetKind:     QuickActionTargetWorkspace,
		InvocationPath: "POST /api/v1/workspace/layouts/save",
		ExecutionKind:  QuickActionExecutionBearing,
	},
	{
		ID:                      "remote.start_profile_session",
		Label:                   "Start Remote Session From Profile",
		Category:                "remote",
		TargetKind:              QuickActionTargetRemote,
		InvocationPath:          "POST /api/v1/remote/profiles/{profile_id}/session",
		RequiresExplicitContext: true,
		ContextRequirement:      "remote_profile_id",
		ExecutionKind:           QuickActionExecutionBearing,
	},
	{
		ID:                      "terminal.explain_latest_output_in_ai",
		Label:                   "Explain Latest Output In AI",
		Category:                "terminal",
		TargetKind:              QuickActionTargetTool,
		InvocationPath:          "POST /api/v1/agent/terminal-commands/explain",
		RequiresExplicitContext: true,
		ContextRequirement:      "active_terminal_widget",
		ExecutionKind:           QuickActionExecutionBearing,
	},
	{
		ID:                      "files.use_selected_path_in_ai_prompt",
		Label:                   "Use Selected Path In AI Prompt",
		Category:                "files",
		TargetKind:              QuickActionTargetLocal,
		InvocationPath:          "frontend.ai_prompt.insert_selected_path",
		RequiresExplicitContext: true,
		ContextRequirement:      "selected_file_path",
		ExecutionKind:           QuickActionUIOnly,
	},
	{
		ID:                      "files.use_selected_path_in_run_prompt",
		Label:                   "Use Selected Path In /run Prompt",
		Category:                "files",
		TargetKind:              QuickActionTargetLocal,
		InvocationPath:          "frontend.ai_prompt.prepare_run_with_selected_path",
		RequiresExplicitContext: true,
		ContextRequirement:      "selected_file_path",
		ExecutionKind:           QuickActionUIOnly,
	},
	{
		ID:                      "files.use_selected_path_in_remote_run_prompt",
		Label:                   "Use Selected Path In Remote /run Prompt",
		Category:                "files",
		TargetKind:              QuickActionTargetRemote,
		InvocationPath:          "frontend.ai_prompt.prepare_remote_run_with_selected_path",
		RequiresExplicitContext: true,
		ContextRequirement:      "selected_file_path+active_remote_target",
		ExecutionKind:           QuickActionUIOnly,
	},
}

func (r *Runtime) ListQuickActions() []QuickAction {
	return ListQuickActions()
}

func ListQuickActions() []QuickAction {
	actions := make([]QuickAction, len(quickActionCatalog))
	copy(actions, quickActionCatalog)
	return actions
}
