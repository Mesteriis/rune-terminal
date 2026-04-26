package app

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type ConversationContext struct {
	WorkspaceID          string   `json:"workspace_id,omitempty"`
	RepoRoot             string   `json:"repo_root,omitempty"`
	ActiveWidgetID       string   `json:"active_widget_id,omitempty"`
	WidgetIDs            []string `json:"widget_ids,omitempty"`
	ActionSource         string   `json:"action_source,omitempty"`
	TargetSession        string   `json:"target_session,omitempty"`
	TargetConnectionID   string   `json:"target_connection_id,omitempty"`
	WidgetContextEnabled bool     `json:"widget_context_enabled,omitempty"`
}

type ConversationListOptions struct {
	Query string
	Scope string
}

type ConversationListCounts struct {
	Recent   int `json:"recent"`
	Archived int `json:"archived"`
	All      int `json:"all"`
}

var ErrInvalidConversationListScope = errors.New("invalid conversation list scope")

func (r *Runtime) ConversationList(
	ctx context.Context,
	options ConversationListOptions,
) ([]conversation.ConversationSummary, string, ConversationListCounts, error) {
	conversations, activeConversationID, err := r.Conversation.ListConversations(ctx)
	if err != nil {
		return nil, "", ConversationListCounts{}, err
	}

	filteredConversations, counts, err := filterConversationSummaries(conversations, options)
	if err != nil {
		return nil, "", ConversationListCounts{}, err
	}

	return filteredConversations, activeConversationID, counts, nil
}

func filterConversationSummaries(
	conversations []conversation.ConversationSummary,
	options ConversationListOptions,
) ([]conversation.ConversationSummary, ConversationListCounts, error) {
	query := strings.ToLower(strings.TrimSpace(options.Query))
	scope := strings.ToLower(strings.TrimSpace(options.Scope))
	if scope == "" {
		scope = "all"
	}

	switch scope {
	case "all", "recent", "archived":
	default:
		return nil, ConversationListCounts{}, ErrInvalidConversationListScope
	}

	queryFiltered := make([]conversation.ConversationSummary, 0, len(conversations))
	for _, summary := range conversations {
		if query == "" || strings.Contains(strings.ToLower(strings.TrimSpace(summary.Title)), query) {
			queryFiltered = append(queryFiltered, summary)
		}
	}

	counts := ConversationListCounts{}
	for _, summary := range queryFiltered {
		if summary.ArchivedAt == nil {
			counts.Recent += 1
			continue
		}
		counts.Archived += 1
	}
	counts.All = counts.Recent + counts.Archived

	if scope == "all" {
		return queryFiltered, counts, nil
	}

	filteredConversations := make([]conversation.ConversationSummary, 0, len(queryFiltered))
	for _, summary := range queryFiltered {
		archived := summary.ArchivedAt != nil
		if scope == "recent" && !archived {
			filteredConversations = append(filteredConversations, summary)
		}
		if scope == "archived" && archived {
			filteredConversations = append(filteredConversations, summary)
		}
	}

	return filteredConversations, counts, nil
}

func (r *Runtime) CreateConversation(ctx context.Context) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.CreateConversation(ctx)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) RenameConversation(
	ctx context.Context,
	conversationID string,
	title string,
) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.RenameConversation(ctx, conversationID, title)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) DeleteConversation(ctx context.Context, conversationID string) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.DeleteConversation(ctx, conversationID)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) ArchiveConversation(ctx context.Context, conversationID string) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.ArchiveConversation(ctx, conversationID)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) RestoreConversation(ctx context.Context, conversationID string) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.RestoreConversation(ctx, conversationID)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) UpdateConversationContextPreferences(
	ctx context.Context,
	conversationID string,
	preferences conversation.ContextPreferences,
) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.UpdateConversationContextPreferences(ctx, conversationID, preferences)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) ActivateConversation(ctx context.Context, conversationID string) (conversation.Snapshot, error) {
	snapshot, err := r.Conversation.ActivateConversation(ctx, conversationID)
	if err != nil {
		return conversation.Snapshot{}, err
	}
	return r.withConversationProviderInfo(snapshot), nil
}

func (r *Runtime) ConversationSnapshot() conversation.Snapshot {
	return r.withConversationProviderInfo(r.Conversation.Snapshot())
}

func (r *Runtime) SubmitConversationPrompt(
	ctx context.Context,
	prompt string,
	selectedModel string,
	conversationContext ConversationContext,
	attachments []conversation.AttachmentReference,
) (conversation.SubmitResult, error) {
	binding, err := r.resolveConversationProviderBindingForModel(selectedModel)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	submitRequest, profile, err := r.prepareConversationSubmit(prompt, binding.Model, conversationContext, attachments)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	if binding.Provider == nil {
		result, err := r.Conversation.Submit(ctx, submitRequest)
		if err != nil {
			return conversation.SubmitResult{}, err
		}
		r.appendConversationAudit(prompt, conversationContext, profile, result.ProviderError)
		return result, nil
	}
	startedAt := time.Now().UTC()
	result, err := r.Conversation.SubmitWithProvider(ctx, binding.Provider, submitRequest)
	r.recordConversationProviderRun(ctx, binding, providergateway.RunModeSync, startedAt, result, err)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	r.appendConversationAudit(prompt, conversationContext, profile, result.ProviderError)
	return result, nil
}

func (r *Runtime) StreamConversationPrompt(
	ctx context.Context,
	prompt string,
	selectedModel string,
	conversationContext ConversationContext,
	attachments []conversation.AttachmentReference,
	emit func(conversation.StreamEvent) error,
) (conversation.SubmitResult, error) {
	binding, err := r.resolveConversationProviderBindingForModel(selectedModel)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	submitRequest, profile, err := r.prepareConversationSubmit(prompt, binding.Model, conversationContext, attachments)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	if binding.Provider == nil {
		result, err := r.Conversation.SubmitStream(ctx, submitRequest, emit)
		if err != nil {
			return conversation.SubmitResult{}, err
		}
		r.appendConversationAudit(prompt, conversationContext, profile, result.ProviderError)
		return result, nil
	}
	startedAt := time.Now().UTC()
	result, err := r.Conversation.SubmitStreamWithProvider(ctx, binding.Provider, submitRequest, emit)
	r.recordConversationProviderRun(ctx, binding, providergateway.RunModeStream, startedAt, result, err)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	r.appendConversationAudit(prompt, conversationContext, profile, result.ProviderError)
	return result, nil
}

func (r *Runtime) prepareConversationSubmit(
	prompt string,
	selectedModel string,
	conversationContext ConversationContext,
	attachments []conversation.AttachmentReference,
) (conversation.SubmitRequest, policy.EvaluationProfile, error) {
	resolvedAttachments, err := resolveConversationAttachments(attachments)
	if err != nil {
		return conversation.SubmitRequest{}, policy.EvaluationProfile{}, err
	}
	providerPrompt := buildPromptWithAttachmentContext(prompt, resolvedAttachments)

	selection, err := r.Agent.Selection()
	if err != nil {
		return conversation.SubmitRequest{}, policy.EvaluationProfile{}, err
	}

	systemPrompt := strings.TrimSpace(selection.EffectivePrompt())
	contextBlock := buildConversationContextBlock(r, conversationContext)
	if contextBlock != "" {
		systemPrompt = strings.TrimSpace(systemPrompt + "\n\n" + contextBlock)
	}

	return conversation.SubmitRequest{
		SystemPrompt:   systemPrompt,
		Prompt:         prompt,
		ProviderPrompt: providerPrompt,
		Model:          strings.TrimSpace(selectedModel),
		Attachments:    attachments,
	}, selection.EffectivePolicyProfile(), nil
}

func (r *Runtime) appendConversationAudit(
	prompt string,
	conversationContext ConversationContext,
	profile policy.EvaluationProfile,
	providerError string,
) {
	_ = r.Audit.Append(audit.Event{
		ToolName:        "agent.conversation",
		Summary:         summarizeConversationPrompt(prompt),
		WorkspaceID:     conversationContext.WorkspaceID,
		PromptProfileID: profile.PromptProfileID,
		RoleID:          profile.RoleID,
		ModeID:          profile.ModeID,
		SecurityPosture: profile.SecurityPosture,
		Success:         providerError == "",
		Error:           providerError,
		ActionSource:    conversationContext.ActionSource,
		AffectedWidgets: affectedWidgets(conversationContext),
	})
}

func (r *Runtime) withConversationProviderInfo(snapshot conversation.Snapshot) conversation.Snapshot {
	provider, err := r.resolveConversationProvider()
	if err != nil {
		snapshot.Provider = conversation.ProviderInfo{}
		return snapshot
	}
	if provider == nil {
		return snapshot
	}
	snapshot.Provider = provider.Info()
	return snapshot
}

func buildConversationContextBlock(runtime *Runtime, conversationContext ConversationContext) string {
	lines := []string{
		"Current RunaTerminal context:",
		fmt.Sprintf("- Repository root: %s", firstNonEmpty(conversationContext.RepoRoot, runtime.RepoRoot)),
	}
	if conversationContext.WorkspaceID != "" {
		lines = append(lines, fmt.Sprintf("- Workspace: %s", conversationContext.WorkspaceID))
	}
	if !conversationContext.WidgetContextEnabled {
		lines = append(lines, "- Active widget context: detached")
	} else {
		activeWidgetID := strings.TrimSpace(conversationContext.ActiveWidgetID)
		if activeWidgetID != "" {
			lines = append(lines, fmt.Sprintf("- Active widget: %s", activeWidgetID))
		}

		contextWidgetIDs := effectiveConversationWidgetIDs(conversationContext)
		if len(contextWidgetIDs) == 0 {
			lines = append(lines, "- Context widgets: none selected")
		} else {
			lines = append(lines, "- Context widgets:")
			for _, widgetLabel := range describeConversationWidgets(runtime, contextWidgetIDs) {
				lines = append(lines, fmt.Sprintf("  - %s", widgetLabel))
			}
		}
	}
	if conversationContext.TargetSession != "" || conversationContext.TargetConnectionID != "" {
		targetSession := firstNonEmpty(conversationContext.TargetSession, "local")
		targetConnectionID := firstNonEmpty(conversationContext.TargetConnectionID, targetSession)
		lines = append(lines, fmt.Sprintf("- Active terminal target: %s (%s)", targetConnectionID, targetSession))
	}
	if activeConnection, err := runtime.Connections.Active(); err == nil {
		target := activeConnection.Name
		if target == "" {
			target = activeConnection.ID
		}
		lines = append(lines, fmt.Sprintf("- Default target: %s (%s)", target, activeConnection.Kind))
	}
	lines = append(lines, "- Keep responses concise and actionable. Do not assume tool execution unless the user explicitly asks for it through shell controls.")
	return strings.Join(lines, "\n")
}

func summarizeConversationPrompt(prompt string) string {
	trimmed := strings.TrimSpace(prompt)
	if len(trimmed) <= 120 {
		return trimmed
	}
	return trimmed[:117] + "..."
}

func affectedWidgets(conversationContext ConversationContext) []string {
	widgetIDs := effectiveConversationWidgetIDs(conversationContext)
	if len(widgetIDs) == 0 {
		return nil
	}
	return widgetIDs
}

func effectiveConversationWidgetIDs(conversationContext ConversationContext) []string {
	if !conversationContext.WidgetContextEnabled {
		return nil
	}

	widgetIDs := normalizeWidgetIDs(conversationContext.WidgetIDs)
	if len(widgetIDs) > 0 {
		return widgetIDs
	}

	activeWidgetID := strings.TrimSpace(conversationContext.ActiveWidgetID)
	if activeWidgetID == "" {
		return nil
	}

	return []string{activeWidgetID}
}

func normalizeWidgetIDs(widgetIDs []string) []string {
	normalized := make([]string, 0, len(widgetIDs))
	for _, widgetID := range widgetIDs {
		trimmedWidgetID := strings.TrimSpace(widgetID)
		if trimmedWidgetID == "" || slices.Contains(normalized, trimmedWidgetID) {
			continue
		}
		normalized = append(normalized, trimmedWidgetID)
	}
	return normalized
}

func describeConversationWidgets(runtime *Runtime, widgetIDs []string) []string {
	widgetsByID := make(map[string]workspace.Widget, len(widgetIDs))
	for _, widget := range runtime.Workspace.ListWidgets() {
		widgetsByID[widget.ID] = widget
	}

	descriptions := make([]string, 0, len(widgetIDs))
	for _, widgetID := range widgetIDs {
		widget, ok := widgetsByID[widgetID]
		if !ok {
			descriptions = append(descriptions, widgetID)
			continue
		}
		descriptions = append(descriptions, formatConversationWidget(widget))
	}
	return descriptions
}

func formatConversationWidget(widget workspace.Widget) string {
	label := widget.ID
	title := strings.TrimSpace(widget.Title)
	if title != "" && title != widget.ID {
		label = fmt.Sprintf("%s (%s)", title, widget.ID)
	}

	meta := []string{string(widget.Kind)}
	if widget.ConnectionID != "" {
		meta = append(meta, widget.ConnectionID)
	}
	if widget.Path != "" {
		meta = append(meta, widget.Path)
	}

	return fmt.Sprintf("%s · %s", label, strings.Join(meta, " · "))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
