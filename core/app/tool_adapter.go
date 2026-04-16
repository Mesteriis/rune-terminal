package app

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type runtimeToolAdapter struct {
	runtime *Runtime
}

func newRuntimeToolAdapter(runtime *Runtime) *runtimeToolAdapter {
	return &runtimeToolAdapter{runtime: runtime}
}

func (a *runtimeToolAdapter) resolveWidgetID(widgetID string) (string, error) {
	return a.runtime.resolveWidgetID(widgetID)
}

func (a *runtimeToolAdapter) normalizeScopeRef(
	scope policy.Scope,
	scopeRef string,
	execCtx toolruntime.ExecutionContext,
) string {
	return a.runtime.normalizeScopeRef(scope, scopeRef, execCtx)
}

func (a *runtimeToolAdapter) connectionsSnapshot() connections.Snapshot {
	return a.runtime.ConnectionsSnapshot()
}

func (a *runtimeToolAdapter) selectActiveConnection(connectionID string) (connections.Snapshot, error) {
	return a.runtime.SelectActiveConnection(connectionID)
}

func (a *runtimeToolAdapter) saveSSHConnection(
	input connections.SaveSSHInput,
) (connections.Connection, connections.Snapshot, error) {
	return a.runtime.SaveSSHConnection(input)
}

func (a *runtimeToolAdapter) checkConnection(
	ctx context.Context,
	connectionID string,
) (connections.Connection, connections.Snapshot, error) {
	return a.runtime.CheckConnection(ctx, connectionID)
}

func (a *runtimeToolAdapter) listTabs() []workspace.Tab {
	return a.runtime.Workspace.ListTabs()
}

func (a *runtimeToolAdapter) activeTab() (workspace.Tab, error) {
	return a.runtime.Workspace.ActiveTab()
}

func (a *runtimeToolAdapter) focusTab(tabID string) (workspace.Tab, error) {
	return a.runtime.Workspace.FocusTab(tabID)
}

func (a *runtimeToolAdapter) moveTab(tabID string, beforeTabID string) (workspace.Snapshot, error) {
	return a.runtime.MoveTab(tabID, beforeTabID)
}

func (a *runtimeToolAdapter) renameTab(tabID string, title string) (WorkspaceTabResult, error) {
	return a.runtime.RenameTab(tabID, title)
}

func (a *runtimeToolAdapter) setTabPinned(tabID string, pinned bool) (WorkspaceTabResult, error) {
	return a.runtime.SetTabPinned(tabID, pinned)
}

func (a *runtimeToolAdapter) createTerminalTabWithConnection(
	ctx context.Context,
	title string,
	connectionID string,
) (CreateTerminalTabResult, error) {
	return a.runtime.CreateTerminalTabWithConnection(ctx, title, connectionID)
}

func (a *runtimeToolAdapter) closeTab(tabID string) (CloseTabResult, error) {
	return a.runtime.CloseTab(tabID)
}

func (a *runtimeToolAdapter) listWidgets() []workspace.Widget {
	return a.runtime.Workspace.ListWidgets()
}

func (a *runtimeToolAdapter) activeWidget() (workspace.Widget, error) {
	return a.runtime.Workspace.ActiveWidget()
}

func (a *runtimeToolAdapter) focusWidget(widgetID string) (workspace.Widget, error) {
	return a.runtime.Workspace.FocusWidget(widgetID)
}

func (a *runtimeToolAdapter) terminalGetState(widgetID string) (terminal.State, error) {
	return a.runtime.Terminals.GetState(widgetID)
}

func (a *runtimeToolAdapter) terminalSendInput(
	widgetID string,
	text string,
	appendNewline bool,
) (terminal.InputResult, error) {
	return a.runtime.Terminals.SendInput(widgetID, text, appendNewline)
}

func (a *runtimeToolAdapter) terminalInterrupt(widgetID string) error {
	return a.runtime.Terminals.Interrupt(widgetID)
}

func (a *runtimeToolAdapter) confirmApproval(id string) (toolruntime.ApprovalGrant, error) {
	return a.runtime.Executor.Confirm(id)
}

func (a *runtimeToolAdapter) addTrustedRule(rule policy.TrustedRule) (policy.TrustedRule, error) {
	return a.runtime.Policy.AddTrustedRule(rule)
}

func (a *runtimeToolAdapter) listTrustedRules() []policy.TrustedRule {
	return a.runtime.Policy.ListTrustedRules()
}

func (a *runtimeToolAdapter) removeTrustedRule(id string) (bool, error) {
	return a.runtime.Policy.RemoveTrustedRule(id)
}

func (a *runtimeToolAdapter) addIgnoreRule(rule policy.IgnoreRule) (policy.IgnoreRule, error) {
	return a.runtime.Policy.AddIgnoreRule(rule)
}

func (a *runtimeToolAdapter) listIgnoreRules() []policy.IgnoreRule {
	return a.runtime.Policy.ListIgnoreRules()
}

func (a *runtimeToolAdapter) removeIgnoreRule(id string) (bool, error) {
	return a.runtime.Policy.RemoveIgnoreRule(id)
}
