package app

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	osuser "os/user"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

const (
	installablePluginManifestFile      = "rterm-plugin.json"
	pluginArchiveMaxDownloadedBytes    = 32 << 20
	pluginArchiveMaxExtractedBytes     = 32 << 20
	pluginArchiveMaxExtractedFileCount = 4096
)

type InstallPluginInput struct {
	Source   PluginInstallSource `json:"source"`
	Metadata map[string]string   `json:"metadata,omitempty"`
	Access   PluginAccessPolicy  `json:"access,omitempty"`
}

type installablePluginManifest struct {
	PluginID        string                   `json:"plugin_id"`
	DisplayName     string                   `json:"display_name,omitempty"`
	Description     string                   `json:"description,omitempty"`
	PluginVersion   string                   `json:"plugin_version"`
	ProtocolVersion string                   `json:"protocol_version"`
	Capabilities    []string                 `json:"capabilities,omitempty"`
	Process         installablePluginProcess `json:"process"`
	Tools           []installablePluginTool  `json:"tools"`
}

type installablePluginProcess struct {
	Command string   `json:"command"`
	Args    []string `json:"args,omitempty"`
	Dir     string   `json:"dir,omitempty"`
	Env     []string `json:"env,omitempty"`
}

type installablePluginTool struct {
	Name         string                  `json:"name"`
	Description  string                  `json:"description,omitempty"`
	InputSchema  json.RawMessage         `json:"input_schema"`
	OutputSchema json.RawMessage         `json:"output_schema"`
	Capabilities []string                `json:"capabilities,omitempty"`
	ApprovalTier toolruntimeApprovalTier `json:"approval_tier"`
	Mutating     bool                    `json:"mutating,omitempty"`
	TargetKind   toolruntimeTargetKind   `json:"target_kind"`
}

type toolruntimeApprovalTier string
type toolruntimeTargetKind string

func (r *Runtime) currentPluginActor() PluginActor {
	if user, err := osuser.Current(); err == nil {
		return PluginActor{
			Username: strings.TrimSpace(user.Username),
			HomeDir:  strings.TrimSpace(user.HomeDir),
		}
	}

	username := strings.TrimSpace(firstNonEmpty(os.Getenv("USER"), os.Getenv("USERNAME")))
	if username == "" {
		username = "unknown"
	}
	return PluginActor{
		Username: username,
		HomeDir:  strings.TrimSpace(r.HomeDir),
	}
}

func (r *Runtime) ListInstalledPlugins() (PluginCatalog, error) {
	if r.PluginCatalog == nil {
		return PluginCatalog{}, ErrPluginCatalogNotConfigured
	}
	return r.PluginCatalog.Snapshot(r.currentPluginActor()), nil
}

func (r *Runtime) InstallPlugin(
	ctx context.Context,
	input InstallPluginInput,
) (created InstalledPluginRecord, catalog PluginCatalog, err error) {
	actor := r.currentPluginActor()
	auditRecord := InstalledPluginRecord{Source: input.Source}
	defer func() {
		if created.ID != "" {
			auditRecord = created
		}
		r.appendPluginCatalogAudit(pluginCatalogAuditInput{
			Action:  "install",
			Record:  auditRecord,
			Source:  input.Source,
			Actor:   actor,
			Success: err == nil,
			Error:   err,
		})
	}()

	if r.PluginCatalog == nil {
		return InstalledPluginRecord{}, PluginCatalog{}, ErrPluginCatalogNotConfigured
	}

	record, installRoot, err := r.prepareInstalledPlugin(ctx, input, "")
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	auditRecord = record
	cleanupOnFailure := true
	defer func() {
		if cleanupOnFailure {
			_ = os.RemoveAll(installRoot)
		}
	}()

	record, installRoot, err = r.promoteInstalledPlugin(record)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	auditRecord = record

	if err := r.registerInstalledPlugin(record); err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}

	record.Enabled = true
	record.RuntimeStatus = PluginRuntimeStatusReady
	record.RuntimeError = ""
	created, catalog, err = r.PluginCatalog.Create(record, actor)
	if err != nil {
		r.unregisterInstalledPlugin(record)
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	cleanupOnFailure = false
	return created, catalog, nil
}

func (r *Runtime) SetPluginEnabled(
	id string,
	enabled bool,
) (updated InstalledPluginRecord, catalog PluginCatalog, err error) {
	actor := r.currentPluginActor()
	action := "disable"
	if enabled {
		action = "enable"
	}
	auditRecord := InstalledPluginRecord{ID: strings.TrimSpace(id)}
	defer func() {
		if updated.ID != "" {
			auditRecord = updated
		}
		r.appendPluginCatalogAudit(pluginCatalogAuditInput{
			Action:  action,
			Record:  auditRecord,
			Source:  auditRecord.Source,
			Actor:   actor,
			Success: err == nil,
			Error:   err,
		})
	}()

	if r.PluginCatalog == nil {
		return InstalledPluginRecord{}, PluginCatalog{}, ErrPluginCatalogNotConfigured
	}

	record, err := r.PluginCatalog.Get(id)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	auditRecord = record

	if enabled {
		if err := r.registerInstalledPlugin(record); err != nil {
			return InstalledPluginRecord{}, PluginCatalog{}, err
		}
		record.Enabled = true
		record.RuntimeStatus = PluginRuntimeStatusReady
		record.RuntimeError = ""
		updated, catalog, err = r.PluginCatalog.Replace(record, actor)
		if err != nil {
			r.unregisterInstalledPlugin(record)
			return InstalledPluginRecord{}, PluginCatalog{}, err
		}
		return updated, catalog, nil
	}

	r.unregisterInstalledPlugin(record)
	previous := record
	record.Enabled = false
	record.RuntimeStatus = PluginRuntimeStatusDisabled
	record.RuntimeError = ""
	updated, catalog, err = r.PluginCatalog.Replace(record, actor)
	if err != nil && previous.Enabled {
		_ = r.registerInstalledPlugin(previous)
	}
	return updated, catalog, err
}

func (r *Runtime) UpdateInstalledPlugin(
	ctx context.Context,
	id string,
) (updated InstalledPluginRecord, catalog PluginCatalog, err error) {
	actor := r.currentPluginActor()
	auditRecord := InstalledPluginRecord{ID: strings.TrimSpace(id)}
	defer func() {
		if updated.ID != "" {
			auditRecord = updated
		}
		r.appendPluginCatalogAudit(pluginCatalogAuditInput{
			Action:  "update",
			Record:  auditRecord,
			Source:  auditRecord.Source,
			Actor:   actor,
			Success: err == nil,
			Error:   err,
		})
	}()

	if r.PluginCatalog == nil {
		return InstalledPluginRecord{}, PluginCatalog{}, ErrPluginCatalogNotConfigured
	}

	existing, err := r.PluginCatalog.Get(id)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	auditRecord = existing
	input := InstallPluginInput{
		Source:   existing.Source,
		Metadata: existing.Metadata,
		Access:   existing.Access,
	}

	nextRecord, installRoot, err := r.prepareInstalledPlugin(ctx, input, existing.ID)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	cleanupOnFailure := true
	defer func() {
		if cleanupOnFailure {
			_ = os.RemoveAll(installRoot)
		}
	}()

	backupRoot, nextRecord, err := r.swapInstalledPluginRoot(existing, nextRecord)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}

	if existing.Enabled {
		r.unregisterInstalledPlugin(existing)
		if err := r.registerInstalledPlugin(nextRecord); err != nil {
			_ = r.restoreInstalledPluginRoot(existing, nextRecord, backupRoot)
			_ = r.registerInstalledPlugin(existing)
			return InstalledPluginRecord{}, PluginCatalog{}, err
		}
		nextRecord.Enabled = true
		nextRecord.RuntimeStatus = PluginRuntimeStatusReady
		nextRecord.RuntimeError = ""
	} else {
		nextRecord.Enabled = false
		nextRecord.RuntimeStatus = PluginRuntimeStatusDisabled
		nextRecord.RuntimeError = ""
	}

	updated, catalog, err = r.PluginCatalog.Replace(nextRecord, actor)
	if err != nil {
		if nextRecord.Enabled {
			r.unregisterInstalledPlugin(nextRecord)
			_ = r.restoreInstalledPluginRoot(existing, nextRecord, backupRoot)
			_ = r.registerInstalledPlugin(existing)
		} else {
			_ = r.restoreInstalledPluginRoot(existing, nextRecord, backupRoot)
		}
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	if strings.TrimSpace(backupRoot) != "" {
		_ = os.RemoveAll(backupRoot)
	}
	cleanupOnFailure = false
	return updated, catalog, nil
}

func (r *Runtime) DeleteInstalledPlugin(id string) (removed InstalledPluginRecord, catalog PluginCatalog, err error) {
	actor := r.currentPluginActor()
	auditRecord := InstalledPluginRecord{ID: strings.TrimSpace(id)}
	defer func() {
		if removed.ID != "" {
			auditRecord = removed
		}
		r.appendPluginCatalogAudit(pluginCatalogAuditInput{
			Action:  "delete",
			Record:  auditRecord,
			Source:  auditRecord.Source,
			Actor:   actor,
			Success: err == nil,
			Error:   err,
		})
	}()

	if r.PluginCatalog == nil {
		return InstalledPluginRecord{}, PluginCatalog{}, ErrPluginCatalogNotConfigured
	}

	record, err := r.PluginCatalog.Get(id)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	auditRecord = record
	r.unregisterInstalledPlugin(record)
	if strings.TrimSpace(record.InstallRoot) != "" {
		if err := os.RemoveAll(record.InstallRoot); err != nil {
			if record.Enabled {
				_ = r.registerInstalledPlugin(record)
			}
			return InstalledPluginRecord{}, PluginCatalog{}, err
		}
	}
	removed, catalog, err = r.PluginCatalog.Delete(id, actor)
	if err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	return removed, catalog, nil
}

func (r *Runtime) syncInstalledPlugins() error {
	if r.PluginCatalog == nil {
		return nil
	}

	snapshot := r.PluginCatalog.Snapshot(r.currentPluginActor())
	for _, record := range snapshot.Plugins {
		if !record.Enabled {
			continue
		}
		if err := r.registerInstalledPlugin(record); err != nil {
			record.RuntimeStatus = PluginRuntimeStatusError
			record.RuntimeError = err.Error()
			record.Enabled = false
			if _, _, replaceErr := r.PluginCatalog.Replace(record, r.currentPluginActor()); replaceErr != nil {
				return replaceErr
			}
			continue
		}
		record.RuntimeStatus = PluginRuntimeStatusReady
		record.RuntimeError = ""
		if _, _, err := r.PluginCatalog.Replace(record, r.currentPluginActor()); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runtime) prepareInstalledPlugin(
	ctx context.Context,
	input InstallPluginInput,
	existingID string,
) (InstalledPluginRecord, string, error) {
	if strings.TrimSpace(r.Paths.PluginInstallRoot) == "" {
		return InstalledPluginRecord{}, "", ErrPluginCatalogNotConfigured
	}
	if err := os.MkdirAll(r.Paths.PluginInstallRoot, 0o755); err != nil {
		return InstalledPluginRecord{}, "", err
	}

	stageRoot, err := os.MkdirTemp(r.Paths.StateDir, "plugin-stage-*")
	if err != nil {
		return InstalledPluginRecord{}, "", err
	}
	defer os.RemoveAll(stageRoot)

	sourceRoot, err := fetchPluginSource(ctx, stageRoot, input.Source)
	if err != nil {
		return InstalledPluginRecord{}, "", err
	}

	pluginRoot, manifest, err := readInstallablePluginManifest(sourceRoot)
	if err != nil {
		return InstalledPluginRecord{}, "", err
	}
	record, err := manifestToInstalledPluginRecord(manifest, pluginRoot, input)
	if err != nil {
		return InstalledPluginRecord{}, "", err
	}
	if existingID != "" && record.ID != strings.TrimSpace(existingID) {
		return InstalledPluginRecord{}, "", fmt.Errorf("%w: plugin id changed during update", plugins.ErrInvalidPluginSpec)
	}

	if existingID == "" {
		if _, err := r.PluginCatalog.Get(record.ID); err == nil {
			return InstalledPluginRecord{}, "", fmt.Errorf("%w: %s", ErrPluginInstalled, record.ID)
		} else if !errors.Is(err, ErrPluginNotFound) {
			return InstalledPluginRecord{}, "", err
		}
	}

	stagedRoot, err := os.MkdirTemp(r.Paths.PluginInstallRoot, record.ID+".staging-*")
	if err != nil {
		return InstalledPluginRecord{}, "", err
	}
	if err := copyDirectory(pluginRoot, stagedRoot); err != nil {
		return InstalledPluginRecord{}, "", err
	}

	record.InstallRoot = stagedRoot
	record.Process = resolveInstalledPluginProcess(stagedRoot, manifest.Process)
	return record, stagedRoot, nil
}

func readInstallablePluginManifest(sourceRoot string) (string, installablePluginManifest, error) {
	manifestPath := filepath.Join(sourceRoot, installablePluginManifestFile)
	if _, err := os.Stat(manifestPath); err == nil {
		manifest, err := loadInstallablePluginManifest(manifestPath)
		return sourceRoot, manifest, err
	}

	entries, err := os.ReadDir(sourceRoot)
	if err != nil {
		return "", installablePluginManifest{}, err
	}
	if len(entries) == 1 && entries[0].IsDir() {
		nestedRoot := filepath.Join(sourceRoot, entries[0].Name())
		manifestPath = filepath.Join(nestedRoot, installablePluginManifestFile)
		manifest, err := loadInstallablePluginManifest(manifestPath)
		return nestedRoot, manifest, err
	}

	return "", installablePluginManifest{}, fmt.Errorf("%w: %s is missing", plugins.ErrInvalidPluginSpec, installablePluginManifestFile)
}

func loadInstallablePluginManifest(path string) (installablePluginManifest, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return installablePluginManifest{}, err
	}
	var manifest installablePluginManifest
	if err := json.Unmarshal(payload, &manifest); err != nil {
		return installablePluginManifest{}, fmt.Errorf("%w: invalid plugin manifest JSON", plugins.ErrInvalidPluginSpec)
	}
	return manifest, nil
}

func manifestToInstalledPluginRecord(
	manifest installablePluginManifest,
	pluginRoot string,
	input InstallPluginInput,
) (InstalledPluginRecord, error) {
	id := strings.TrimSpace(manifest.PluginID)
	if id == "" {
		return InstalledPluginRecord{}, fmt.Errorf("%w: plugin_id is required", plugins.ErrInvalidPluginSpec)
	}
	if id != filepath.Base(id) || id == "." || id == ".." {
		return InstalledPluginRecord{}, fmt.Errorf("%w: plugin_id must not contain path separators", plugins.ErrInvalidPluginSpec)
	}
	version := strings.TrimSpace(manifest.PluginVersion)
	if version == "" {
		return InstalledPluginRecord{}, fmt.Errorf("%w: plugin_version is required", plugins.ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(manifest.ProtocolVersion) != plugins.ProtocolVersionV1 {
		return InstalledPluginRecord{}, fmt.Errorf("%w: unsupported protocol_version", plugins.ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(manifest.Process.Command) == "" {
		return InstalledPluginRecord{}, fmt.Errorf("%w: process.command is required", plugins.ErrInvalidPluginSpec)
	}
	if len(manifest.Tools) == 0 {
		return InstalledPluginRecord{}, fmt.Errorf("%w: at least one tool is required", plugins.ErrInvalidPluginSpec)
	}

	capabilities := normalizeCapabilities(manifest.Capabilities)
	tools := make([]InstalledPluginTool, 0, len(manifest.Tools))
	toolNames := make(map[string]struct{}, len(manifest.Tools))
	for _, rawTool := range manifest.Tools {
		name := strings.TrimSpace(rawTool.Name)
		if name == "" {
			return InstalledPluginRecord{}, fmt.Errorf("%w: tool.name is required", plugins.ErrInvalidPluginSpec)
		}
		if _, ok := toolNames[name]; ok {
			return InstalledPluginRecord{}, fmt.Errorf("%w: duplicate tool name %s", plugins.ErrInvalidPluginSpec, name)
		}
		toolNames[name] = struct{}{}

		if len(bytes.TrimSpace(rawTool.InputSchema)) == 0 {
			rawTool.InputSchema = json.RawMessage(`{"type":"object","additionalProperties":true}`)
		}
		if len(bytes.TrimSpace(rawTool.OutputSchema)) == 0 {
			rawTool.OutputSchema = json.RawMessage(`{"type":"object","additionalProperties":true}`)
		}
		if !json.Valid(rawTool.InputSchema) || !json.Valid(rawTool.OutputSchema) {
			return InstalledPluginRecord{}, fmt.Errorf("%w: tool schemas must be valid JSON", plugins.ErrInvalidPluginSpec)
		}
		targetKind := toolruntime.TargetKind(strings.TrimSpace(string(rawTool.TargetKind)))
		if targetKind == "" {
			targetKind = toolruntime.TargetWorkspace
		}
		switch targetKind {
		case toolruntime.TargetWorkspace, toolruntime.TargetWidget, toolruntime.TargetPolicy:
		default:
			return InstalledPluginRecord{}, fmt.Errorf("%w: unsupported tool target kind", plugins.ErrInvalidPluginSpec)
		}
		approvalTier := policy.ApprovalTier(strings.TrimSpace(string(rawTool.ApprovalTier)))
		if approvalTier == "" {
			approvalTier = policy.ApprovalTierSafe
		}
		switch approvalTier {
		case policy.ApprovalTierSafe, policy.ApprovalTierModerate, policy.ApprovalTierDangerous, policy.ApprovalTierDestructive:
		default:
			return InstalledPluginRecord{}, fmt.Errorf("%w: unsupported approval tier", plugins.ErrInvalidPluginSpec)
		}
		toolCapabilities := normalizeCapabilities(rawTool.Capabilities)
		for _, capability := range toolCapabilities {
			if len(capabilities) > 0 && !slices.Contains(capabilities, capability) {
				return InstalledPluginRecord{}, fmt.Errorf(
					"%w: tool capability %s is outside plugin capability allow-list",
					plugins.ErrInvalidPluginSpec,
					capability,
				)
			}
		}
		tools = append(tools, InstalledPluginTool{
			Name:         name,
			Description:  strings.TrimSpace(rawTool.Description),
			InputSchema:  slices.Clone(rawTool.InputSchema),
			OutputSchema: slices.Clone(rawTool.OutputSchema),
			Capabilities: toolCapabilities,
			ApprovalTier: approvalTier,
			Mutating:     rawTool.Mutating,
			TargetKind:   targetKind,
		})
	}

	process := resolveInstalledPluginProcess(pluginRoot, manifest.Process)
	if err := validateInstalledPluginProcess(process); err != nil {
		return InstalledPluginRecord{}, err
	}

	return InstalledPluginRecord{
		ID:              id,
		DisplayName:     strings.TrimSpace(firstNonEmpty(manifest.DisplayName, id)),
		Description:     strings.TrimSpace(manifest.Description),
		PluginVersion:   version,
		ProtocolVersion: plugins.ProtocolVersionV1,
		Process:         process,
		Capabilities:    capabilities,
		Tools:           tools,
		Source: PluginInstallSource{
			Kind: input.Source.Kind,
			URL:  strings.TrimSpace(input.Source.URL),
			Ref:  strings.TrimSpace(input.Source.Ref),
		},
		Metadata:      cloneStringMap(input.Metadata),
		Access:        input.Access,
		Enabled:       true,
		RuntimeStatus: PluginRuntimeStatusReady,
		InstallRoot:   pluginRoot,
	}, nil
}

func resolveInstalledPluginProcess(root string, process installablePluginProcess) plugins.ProcessConfig {
	config := plugins.ProcessConfig{
		Command: strings.TrimSpace(process.Command),
		Args:    append([]string(nil), process.Args...),
		Env:     append([]string(nil), process.Env...),
	}
	if dir := strings.TrimSpace(process.Dir); dir != "" {
		if filepath.IsAbs(dir) {
			config.Dir = dir
		} else {
			config.Dir = filepath.Clean(filepath.Join(root, dir))
		}
	} else {
		config.Dir = root
	}
	if strings.ContainsRune(config.Command, filepath.Separator) && !filepath.IsAbs(config.Command) {
		config.Command = filepath.Clean(filepath.Join(root, config.Command))
	}
	return config
}

func validateInstalledPluginProcess(config plugins.ProcessConfig) error {
	command := strings.TrimSpace(config.Command)
	if command == "" {
		return fmt.Errorf("%w: plugin command is required", plugins.ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(config.Dir) != "" {
		info, err := os.Stat(config.Dir)
		if err != nil {
			return fmt.Errorf("%w: plugin working directory is invalid: %v", plugins.ErrProcessSpawnFailed, err)
		}
		if !info.IsDir() {
			return fmt.Errorf("%w: plugin working directory is not a directory", plugins.ErrProcessSpawnFailed)
		}
	}
	if strings.ContainsRune(command, filepath.Separator) {
		info, err := os.Stat(command)
		if err != nil {
			return fmt.Errorf("%w: plugin command path is invalid: %v", plugins.ErrProcessSpawnFailed, err)
		}
		if info.IsDir() {
			return fmt.Errorf("%w: plugin command path is a directory", plugins.ErrProcessSpawnFailed)
		}
		return nil
	}
	if _, err := exec.LookPath(command); err != nil {
		return fmt.Errorf("%w: plugin command not found in PATH: %s", plugins.ErrProcessSpawnFailed, command)
	}
	return nil
}

func fetchPluginSource(ctx context.Context, stageRoot string, source PluginInstallSource) (string, error) {
	switch source.Kind {
	case PluginInstallSourceGit:
		return clonePluginRepository(ctx, stageRoot, source)
	case PluginInstallSourceZip:
		return extractPluginArchive(ctx, stageRoot, source)
	default:
		return "", fmt.Errorf("%w: unsupported plugin source kind", plugins.ErrInvalidPluginSpec)
	}
}

func clonePluginRepository(ctx context.Context, stageRoot string, source PluginInstallSource) (string, error) {
	repoURL := strings.TrimSpace(source.URL)
	if repoURL == "" {
		return "", fmt.Errorf("%w: git source url is required", plugins.ErrInvalidPluginSpec)
	}
	target := filepath.Join(stageRoot, "git")
	args := []string{"clone", "--depth", "1"}
	if ref := strings.TrimSpace(source.Ref); ref != "" {
		args = append(args, "--branch", ref)
	}
	args = append(args, repoURL, target)
	cmd := exec.CommandContext(ctx, "git", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%w: git clone failed: %s", plugins.ErrProcessSpawnFailed, strings.TrimSpace(string(output)))
	}
	return target, nil
}

func extractPluginArchive(ctx context.Context, stageRoot string, source PluginInstallSource) (string, error) {
	archiveURL := strings.TrimSpace(source.URL)
	if archiveURL == "" {
		return "", fmt.Errorf("%w: zip source url is required", plugins.ErrInvalidPluginSpec)
	}
	archivePath, cleanup, err := downloadPluginArchive(ctx, stageRoot, archiveURL)
	if err != nil {
		return "", err
	}
	defer cleanup()

	reader, err := zip.OpenReader(archivePath)
	if err != nil {
		return "", fmt.Errorf("%w: invalid zip archive", plugins.ErrInvalidPluginSpec)
	}
	defer reader.Close()

	target := filepath.Join(stageRoot, "zip")
	if err := os.MkdirAll(target, 0o755); err != nil {
		return "", err
	}
	var extractedBytes int64
	entryCount := 0
	for _, file := range reader.File {
		entryCount++
		if entryCount > pluginArchiveMaxExtractedFileCount {
			return "", fmt.Errorf("%w: zip archive contains too many entries", plugins.ErrInvalidPluginSpec)
		}
		entryPath, err := pluginArchiveEntryPath(target, file.Name)
		if err != nil {
			return "", err
		}
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(entryPath, file.Mode()); err != nil {
				return "", err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(entryPath), 0o755); err != nil {
			return "", err
		}
		input, err := file.Open()
		if err != nil {
			return "", err
		}
		output, err := os.OpenFile(entryPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.Mode())
		if err != nil {
			_ = input.Close()
			return "", err
		}
		if err := copyPluginArchiveEntry(output, input, &extractedBytes); err != nil {
			_ = output.Close()
			_ = input.Close()
			return "", err
		}
		_ = output.Close()
		_ = input.Close()
	}
	return target, nil
}

func pluginArchiveEntryPath(target string, name string) (string, error) {
	target = filepath.Clean(target)
	entryName := strings.TrimSpace(name)
	if entryName == "" {
		return "", fmt.Errorf("%w: zip archive contains an invalid path", plugins.ErrInvalidPluginSpec)
	}
	entryPath := filepath.Clean(filepath.Join(target, entryName))
	if !fsPathWithinRoot(entryPath, target) {
		return "", fmt.Errorf("%w: zip archive contains an invalid path", plugins.ErrInvalidPluginSpec)
	}
	return entryPath, nil
}

func copyPluginArchiveEntry(output io.Writer, input io.Reader, extractedBytes *int64) error {
	return copyPluginPayloadWithBudget(output, input, extractedBytes, "zip archive expands beyond limit")
}

func copyPluginPayloadWithBudget(
	output io.Writer,
	input io.Reader,
	copiedBytes *int64,
	limitMessage string,
) error {
	remaining := pluginArchiveMaxExtractedBytes - *copiedBytes
	if remaining < 0 {
		return fmt.Errorf("%w: %s", plugins.ErrInvalidPluginSpec, limitMessage)
	}
	written, err := io.Copy(output, io.LimitReader(input, remaining+1))
	*copiedBytes += written
	if *copiedBytes > pluginArchiveMaxExtractedBytes {
		return fmt.Errorf("%w: %s", plugins.ErrInvalidPluginSpec, limitMessage)
	}
	return err
}

func downloadPluginArchive(ctx context.Context, stageRoot string, archiveURL string) (string, func(), error) {
	if strings.HasPrefix(archiveURL, "file://") {
		parsed, err := url.Parse(archiveURL)
		if err != nil {
			return "", func() {}, fmt.Errorf("%w: invalid file url", plugins.ErrInvalidPluginSpec)
		}
		return filepath.Clean(parsed.Path), func() {}, nil
	}
	parsed, err := url.Parse(archiveURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", func() {}, fmt.Errorf("%w: zip source must be file://, http://, or https://", plugins.ErrInvalidPluginSpec)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, archiveURL, nil)
	if err != nil {
		return "", func() {}, err
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", func() {}, err
	}
	defer response.Body.Close()
	if response.StatusCode >= http.StatusBadRequest {
		return "", func() {}, fmt.Errorf("%w: zip download failed with status %d", plugins.ErrInvalidPluginSpec, response.StatusCode)
	}

	tempPath := filepath.Join(stageRoot, "download.zip")
	output, err := os.OpenFile(tempPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return "", func() {}, err
	}
	written, err := io.Copy(output, io.LimitReader(response.Body, pluginArchiveMaxDownloadedBytes+1))
	if err != nil {
		_ = output.Close()
		return "", func() {}, err
	}
	if written > pluginArchiveMaxDownloadedBytes {
		_ = output.Close()
		return "", func() {}, fmt.Errorf("%w: zip archive download is too large", plugins.ErrInvalidPluginSpec)
	}
	if err := output.Close(); err != nil {
		return "", func() {}, err
	}
	return tempPath, func() {
		_ = os.Remove(tempPath)
	}, nil
}

func copyDirectory(sourceRoot string, targetRoot string) error {
	var copiedBytes int64
	entryCount := 0
	return filepath.WalkDir(sourceRoot, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		entryCount++
		if entryCount > pluginArchiveMaxExtractedFileCount {
			return fmt.Errorf("%w: plugin bundle contains too many entries", plugins.ErrInvalidPluginSpec)
		}
		relative, err := filepath.Rel(sourceRoot, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(targetRoot, relative)
		if entry.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("%w: plugin bundle contains symlink entry", plugins.ErrInvalidPluginSpec)
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("%w: plugin bundle contains symlink entry", plugins.ErrInvalidPluginSpec)
		}
		if entry.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		}
		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return err
		}
		input, err := os.Open(path)
		if err != nil {
			return err
		}
		defer input.Close()
		output, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode())
		if err != nil {
			return err
		}
		if err := copyPluginPayloadWithBudget(
			output,
			input,
			&copiedBytes,
			"plugin bundle expands beyond limit",
		); err != nil {
			_ = output.Close()
			return err
		}
		return output.Close()
	})
}

func (r *Runtime) promoteInstalledPlugin(record InstalledPluginRecord) (InstalledPluginRecord, string, error) {
	stagedRoot := strings.TrimSpace(record.InstallRoot)
	finalRoot := filepath.Join(r.Paths.PluginInstallRoot, record.ID)
	if err := os.RemoveAll(finalRoot); err != nil {
		return InstalledPluginRecord{}, "", err
	}
	if err := os.Rename(stagedRoot, finalRoot); err != nil {
		return InstalledPluginRecord{}, "", err
	}
	return relocateInstalledPluginRecord(record, stagedRoot, finalRoot), finalRoot, nil
}

func (r *Runtime) swapInstalledPluginRoot(
	existing InstalledPluginRecord,
	next InstalledPluginRecord,
) (string, InstalledPluginRecord, error) {
	finalRoot := filepath.Join(r.Paths.PluginInstallRoot, next.ID)
	stagedRoot := strings.TrimSpace(next.InstallRoot)
	backupRoot := ""

	if info, err := os.Stat(finalRoot); err == nil {
		if !info.IsDir() {
			return "", InstalledPluginRecord{}, fmt.Errorf("%w: existing install root is not a directory", plugins.ErrProcessSpawnFailed)
		}
		candidate, err := os.MkdirTemp(r.Paths.PluginInstallRoot, next.ID+".backup-*")
		if err != nil {
			return "", InstalledPluginRecord{}, err
		}
		if err := os.Remove(candidate); err != nil {
			return "", InstalledPluginRecord{}, err
		}
		if err := os.Rename(finalRoot, candidate); err != nil {
			return "", InstalledPluginRecord{}, err
		}
		backupRoot = candidate
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", InstalledPluginRecord{}, err
	}

	if err := os.Rename(stagedRoot, finalRoot); err != nil {
		if backupRoot != "" {
			_ = os.Rename(backupRoot, finalRoot)
		}
		return "", InstalledPluginRecord{}, err
	}
	return backupRoot, relocateInstalledPluginRecord(next, stagedRoot, finalRoot), nil
}

func (r *Runtime) restoreInstalledPluginRoot(
	existing InstalledPluginRecord,
	next InstalledPluginRecord,
	backupRoot string,
) error {
	finalRoot := filepath.Join(r.Paths.PluginInstallRoot, existing.ID)
	if err := os.RemoveAll(strings.TrimSpace(next.InstallRoot)); err != nil {
		return err
	}
	if strings.TrimSpace(backupRoot) == "" {
		return nil
	}
	return os.Rename(backupRoot, finalRoot)
}

func relocateInstalledPluginRecord(record InstalledPluginRecord, fromRoot string, toRoot string) InstalledPluginRecord {
	record.InstallRoot = toRoot
	record.Process = relocateProcessConfig(record.Process, fromRoot, toRoot)
	return record
}

func relocateProcessConfig(config plugins.ProcessConfig, fromRoot string, toRoot string) plugins.ProcessConfig {
	config.Command = relocateInstallPath(config.Command, fromRoot, toRoot)
	config.Dir = relocateInstallPath(config.Dir, fromRoot, toRoot)
	return config
}

func relocateInstallPath(path string, fromRoot string, toRoot string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" || !filepath.IsAbs(trimmed) {
		return trimmed
	}
	relative, err := filepath.Rel(fromRoot, trimmed)
	if err != nil {
		return trimmed
	}
	if relative == "." {
		return toRoot
	}
	if strings.HasPrefix(relative, ".."+string(filepath.Separator)) || relative == ".." {
		return trimmed
	}
	return filepath.Join(toRoot, relative)
}

func (r *Runtime) registerInstalledPlugin(record InstalledPluginRecord) error {
	definitions, err := installedPluginDefinitions(record)
	if err != nil {
		return err
	}
	existingTools := r.Registry.List()
	for _, definition := range definitions {
		for _, tool := range existingTools {
			if tool.Name == definition.Name {
				return fmt.Errorf("%w: tool %s is already registered", plugins.ErrInvalidPluginSpec, definition.Name)
			}
		}
	}
	for _, definition := range definitions {
		if err := r.Registry.Register(definition); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runtime) unregisterInstalledPlugin(record InstalledPluginRecord) {
	for _, tool := range record.Tools {
		r.Registry.Unregister(tool.Name)
	}
}

func installedPluginDefinitions(record InstalledPluginRecord) ([]toolruntime.Definition, error) {
	definitions := make([]toolruntime.Definition, 0, len(record.Tools))
	for _, tool := range record.Tools {
		toolName := tool.Name
		toolDescription := tool.Description
		toolCapabilities := append([]string(nil), tool.Capabilities...)
		approvalTier := tool.ApprovalTier
		targetKind := tool.TargetKind
		mutating := tool.Mutating
		definitions = append(definitions, toolruntime.PluginBackedDefinition(toolruntime.Definition{
			Name:         toolName,
			Description:  toolDescription,
			InputSchema:  slices.Clone(tool.InputSchema),
			OutputSchema: slices.Clone(tool.OutputSchema),
			Metadata: toolruntime.Metadata{
				Capabilities: toolCapabilities,
				ApprovalTier: approvalTier,
				Mutating:     mutating,
				TargetKind:   targetKind,
			},
			Decode: func(raw json.RawMessage) (any, error) {
				if len(bytes.TrimSpace(raw)) == 0 {
					return json.RawMessage(`{}`), nil
				}
				if !json.Valid(raw) {
					return nil, toolruntime.InvalidInputError("plugin input must be valid JSON")
				}
				return json.RawMessage(bytes.TrimSpace(raw)), nil
			},
			Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
				return toolruntime.OperationPlan{
					Operation: toolruntime.Operation{
						Summary:              "invoke plugin tool " + toolName,
						RequiredCapabilities: append([]string(nil), toolCapabilities...),
						ApprovalTier:         approvalTier,
					},
				}, nil
			},
			Execute: func(context.Context, toolruntime.ExecutionContext, any) (any, error) {
				return map[string]any{}, nil
			},
		}, plugins.PluginSpec{
			Name:         record.ID,
			Process:      record.Process,
			Protocol:     record.ProtocolVersion,
			Timeout:      5 * time.Second,
			Capabilities: append([]string(nil), record.Capabilities...),
		}))
	}
	return definitions, nil
}
