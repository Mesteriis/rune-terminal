package conversation

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	defaultCodexCLICommand      = "codex"
	defaultCodexCLIModel        = "gpt-5-codex"
	defaultClaudeCodeCommand    = "claude"
	defaultClaudeCodeModel      = "sonnet"
	defaultCLICompletionTimeout = 2 * time.Minute
)

type CodexCLIProviderConfig struct {
	Command string
	Model   string
}

type ClaudeCodeProviderConfig struct {
	Command string
	Model   string
}

type localCLIProvider struct {
	kind    string
	command string
	model   string
	mode    localCLIMode
}

type localCLIMode string

const (
	localCLIModeCodex      localCLIMode = "codex"
	localCLIModeClaudeCode localCLIMode = "claude-code"
)

func NewCodexCLIProvider(config CodexCLIProviderConfig) *localCLIProvider {
	return &localCLIProvider{
		kind:    "codex",
		command: strings.TrimSpace(firstNonEmptyString(config.Command, defaultCodexCLICommand)),
		model:   strings.TrimSpace(firstNonEmptyString(config.Model, defaultCodexCLIModel)),
		mode:    localCLIModeCodex,
	}
}

func NewClaudeCodeProvider(config ClaudeCodeProviderConfig) *localCLIProvider {
	return &localCLIProvider{
		kind:    "claude",
		command: strings.TrimSpace(firstNonEmptyString(config.Command, defaultClaudeCodeCommand)),
		model:   strings.TrimSpace(firstNonEmptyString(config.Model, defaultClaudeCodeModel)),
		mode:    localCLIModeClaudeCode,
	}
}

func ListCodexCLIModels(model string, configuredModels []string) []string {
	return compactModelIDs(append(
		[]string{firstNonEmptyString(model, defaultCodexCLIModel)},
		configuredModels...,
	))
}

func ListClaudeCodeModels(model string, configuredModels []string) []string {
	return compactModelIDs(append(
		[]string{firstNonEmptyString(model, defaultClaudeCodeModel), "opus"},
		configuredModels...,
	))
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func compactModelIDs(models []string) []string {
	compact := make([]string, 0, len(models))
	seen := make(map[string]struct{}, len(models))

	for _, rawModel := range models {
		model := strings.TrimSpace(rawModel)
		if model == "" {
			continue
		}
		if _, ok := seen[model]; ok {
			continue
		}
		seen[model] = struct{}{}
		compact = append(compact, model)
	}
	return compact
}

func (p *localCLIProvider) Info() ProviderInfo {
	return ProviderInfo{
		Kind:      p.kind,
		Model:     p.model,
		Streaming: false,
	}
}

func (p *localCLIProvider) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, nil)
}

func (p *localCLIProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, onTextDelta)
}

func (p *localCLIProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	info := p.Info()
	if model := strings.TrimSpace(request.Model); model != "" {
		info.Model = model
	}
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, info, err
	}
	if strings.TrimSpace(p.command) == "" {
		return CompletionResult{}, info, fmt.Errorf("%s command is required", p.kind)
	}

	content, err := p.run(ctx, request, info.Model)
	if err != nil {
		return CompletionResult{}, info, err
	}
	content = strings.TrimSpace(content)
	if onTextDelta != nil && content != "" {
		if err := onTextDelta(content); err != nil {
			return CompletionResult{}, info, err
		}
	}
	return CompletionResult{
		Content: content,
		Model:   info.Model,
	}, info, nil
}

func (p *localCLIProvider) run(ctx context.Context, request CompletionRequest, model string) (string, error) {
	switch p.mode {
	case localCLIModeCodex:
		return runCodexCLI(ctx, p.command, model, formatCLICompletionPrompt(request, true))
	case localCLIModeClaudeCode:
		return runClaudeCodeCLI(ctx, p.command, model, request.SystemPrompt, formatCLICompletionPrompt(request, false))
	default:
		return "", fmt.Errorf("unsupported cli provider mode: %s", p.mode)
	}
}

func runCodexCLI(ctx context.Context, command string, model string, prompt string) (string, error) {
	outputFile, err := os.CreateTemp("", "rterm-codex-last-message-*.txt")
	if err != nil {
		return "", err
	}
	outputPath := outputFile.Name()
	if err := outputFile.Close(); err != nil {
		return "", err
	}
	defer os.Remove(outputPath)

	args := []string{
		"exec",
		"--color", "never",
		"--sandbox", "read-only",
		"--ask-for-approval", "never",
		"--skip-git-repo-check",
		"--ephemeral",
		"--output-last-message", outputPath,
	}
	if strings.TrimSpace(model) != "" {
		args = append(args, "--model", strings.TrimSpace(model))
	}
	args = append(args, "-")

	stdout, stderr, err := runLocalCLICommand(ctx, command, args, prompt)
	if err != nil {
		return "", formatCLICommandError("codex", err, stdout, stderr)
	}
	if payload, readErr := os.ReadFile(outputPath); readErr == nil && strings.TrimSpace(string(payload)) != "" {
		return string(payload), nil
	}
	return stdout, nil
}

func runClaudeCodeCLI(ctx context.Context, command string, model string, systemPrompt string, prompt string) (string, error) {
	args := []string{
		"-p",
		"--output-format", "text",
		"--no-session-persistence",
		"--tools", "",
	}
	if strings.TrimSpace(model) != "" {
		args = append(args, "--model", strings.TrimSpace(model))
	}
	if strings.TrimSpace(systemPrompt) != "" {
		args = append(args, "--system-prompt", strings.TrimSpace(systemPrompt))
	}
	args = append(args, prompt)

	stdout, stderr, err := runLocalCLICommand(ctx, command, args, "")
	if err != nil {
		return "", formatCLICommandError("claude", err, stdout, stderr)
	}
	return stdout, nil
}

func runLocalCLICommand(ctx context.Context, command string, args []string, stdin string) (string, string, error) {
	resolvedCommand, err := exec.LookPath(strings.TrimSpace(command))
	if err != nil {
		return "", "", err
	}

	runCtx := ctx
	cancel := func() {}
	if _, ok := ctx.Deadline(); !ok {
		runCtx, cancel = context.WithTimeout(ctx, defaultCLICompletionTimeout)
	}
	defer cancel()

	cmd := exec.CommandContext(runCtx, resolvedCommand, args...)
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}
	cmd.Env = append(os.Environ(), "NO_COLOR=1")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if runCtx.Err() != nil {
		return stdout.String(), stderr.String(), runCtx.Err()
	}
	return stdout.String(), stderr.String(), err
}

func formatCLICompletionPrompt(request CompletionRequest, includeSystem bool) string {
	var builder strings.Builder
	if includeSystem {
		builder.WriteString("System instructions:\n")
		builder.WriteString(strings.TrimSpace(request.SystemPrompt))
		builder.WriteString("\n\n")
	}
	builder.WriteString("Conversation transcript:\n")
	for _, message := range request.Messages {
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		builder.WriteString(strings.ToUpper(string(message.Role)))
		builder.WriteString(":\n")
		builder.WriteString(content)
		builder.WriteString("\n\n")
	}
	builder.WriteString("Reply to the final USER message only. Keep the answer concise and actionable.")
	return builder.String()
}

func formatCLICommandError(label string, err error, stdout string, stderr string) error {
	detail := strings.TrimSpace(stderr)
	if detail == "" {
		detail = strings.TrimSpace(stdout)
	}
	if detail == "" {
		return fmt.Errorf("%s cli failed: %w", label, err)
	}
	return fmt.Errorf("%s cli failed: %w: %s", label, err, detail)
}
