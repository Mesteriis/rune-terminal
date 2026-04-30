package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/internal/atomicfile"
)

var (
	ErrPluginCatalogNotConfigured = errors.New("plugin catalog is not configured")
	ErrPluginNotFound             = errors.New("plugin is not installed")
	ErrPluginInstalled            = errors.New("plugin is already installed")
)

type PluginInstallSourceKind string

const (
	PluginInstallSourceGit PluginInstallSourceKind = "git"
	PluginInstallSourceZip PluginInstallSourceKind = "zip"
)

type PluginRuntimeStatus string

const (
	PluginRuntimeStatusDisabled PluginRuntimeStatus = "disabled"
	PluginRuntimeStatusReady    PluginRuntimeStatus = "ready"
	PluginRuntimeStatusError    PluginRuntimeStatus = "validation_error"
)

type PluginActor struct {
	Username string `json:"username"`
	HomeDir  string `json:"home_dir,omitempty"`
}

type PluginAccessPolicy struct {
	OwnerUsername string   `json:"owner_username"`
	Visibility    string   `json:"visibility,omitempty"`
	AllowedUsers  []string `json:"allowed_users,omitempty"`
}

type PluginInstallSource struct {
	Kind PluginInstallSourceKind `json:"kind"`
	URL  string                  `json:"url"`
	Ref  string                  `json:"ref,omitempty"`
}

type InstalledPluginTool struct {
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	InputSchema  json.RawMessage        `json:"input_schema"`
	OutputSchema json.RawMessage        `json:"output_schema"`
	Capabilities []string               `json:"capabilities,omitempty"`
	ApprovalTier policy.ApprovalTier    `json:"approval_tier"`
	Mutating     bool                   `json:"mutating,omitempty"`
	TargetKind   toolruntime.TargetKind `json:"target_kind"`
}

type InstalledPluginRecord struct {
	ID              string                `json:"id"`
	DisplayName     string                `json:"display_name"`
	Description     string                `json:"description,omitempty"`
	PluginVersion   string                `json:"plugin_version"`
	ProtocolVersion string                `json:"protocol_version"`
	Process         plugins.ProcessConfig `json:"process"`
	Capabilities    []string              `json:"capabilities,omitempty"`
	Tools           []InstalledPluginTool `json:"tools"`
	Source          PluginInstallSource   `json:"source"`
	Metadata        map[string]string     `json:"metadata,omitempty"`
	Access          PluginAccessPolicy    `json:"access"`
	InstalledBy     PluginActor           `json:"installed_by"`
	UpdatedBy       PluginActor           `json:"updated_by"`
	Enabled         bool                  `json:"enabled"`
	RuntimeStatus   PluginRuntimeStatus   `json:"runtime_status"`
	RuntimeError    string                `json:"runtime_error,omitempty"`
	InstallRoot     string                `json:"install_root"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
}

type PluginCatalog struct {
	CurrentActor PluginActor             `json:"current_actor"`
	Plugins      []InstalledPluginRecord `json:"plugins"`
}

type pluginCatalogState struct {
	Plugins   []InstalledPluginRecord `json:"plugins,omitempty"`
	UpdatedAt time.Time               `json:"updated_at,omitempty"`
}

type PluginCatalogStore struct {
	mu   sync.RWMutex
	path string
	data pluginCatalogState
}

func NewPluginCatalogStore(path string) (*PluginCatalogStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	store := &PluginCatalogStore{path: path}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *PluginCatalogStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	payload, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.data = pluginCatalogState{}
			return s.saveLocked()
		}
		return err
	}
	if err := json.Unmarshal(payload, &s.data); err != nil {
		return err
	}
	s.data.Plugins = cloneInstalledPluginRecords(s.data.Plugins)
	slices.SortFunc(s.data.Plugins, compareInstalledPluginRecords)
	return nil
}

func (s *PluginCatalogStore) Snapshot(actor PluginActor) PluginCatalog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return PluginCatalog{
		CurrentActor: actor,
		Plugins:      cloneInstalledPluginRecords(s.data.Plugins),
	}
}

func (s *PluginCatalogStore) Get(id string) (InstalledPluginRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := pluginByID(s.data.Plugins, id)
	if !ok {
		return InstalledPluginRecord{}, fmt.Errorf("%w: %s", ErrPluginNotFound, strings.TrimSpace(id))
	}
	return cloneInstalledPluginRecord(record), nil
}

func (s *PluginCatalogStore) Create(record InstalledPluginRecord, actor PluginActor) (InstalledPluginRecord, PluginCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := strings.TrimSpace(record.ID)
	if _, ok := pluginByID(s.data.Plugins, id); ok {
		return InstalledPluginRecord{}, PluginCatalog{}, fmt.Errorf("%w: %s", ErrPluginInstalled, id)
	}

	now := time.Now().UTC()
	record.ID = id
	record.CreatedAt = now
	record.UpdatedAt = now
	record.InstalledBy = normalizePluginActor(actor)
	record.UpdatedBy = normalizePluginActor(actor)
	record.Access = normalizePluginAccess(record.Access, record.InstalledBy)
	record.Metadata = cloneStringMap(record.Metadata)
	record.Tools = cloneInstalledPluginTools(record.Tools)
	record.Capabilities = normalizeCapabilities(record.Capabilities)
	record.RuntimeError = strings.TrimSpace(record.RuntimeError)

	nextData := pluginCatalogState{
		Plugins:   append(cloneInstalledPluginRecords(s.data.Plugins), cloneInstalledPluginRecord(record)),
		UpdatedAt: now,
	}
	slices.SortFunc(nextData.Plugins, compareInstalledPluginRecords)
	if err := s.saveStateLocked(nextData); err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	s.data = nextData
	return cloneInstalledPluginRecord(record), PluginCatalog{
		CurrentActor: normalizePluginActor(actor),
		Plugins:      cloneInstalledPluginRecords(s.data.Plugins),
	}, nil
}

func (s *PluginCatalogStore) Replace(record InstalledPluginRecord, actor PluginActor) (InstalledPluginRecord, PluginCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := pluginIndexByID(s.data.Plugins, record.ID)
	if index < 0 {
		return InstalledPluginRecord{}, PluginCatalog{}, fmt.Errorf("%w: %s", ErrPluginNotFound, strings.TrimSpace(record.ID))
	}

	existing := s.data.Plugins[index]
	now := time.Now().UTC()
	record.CreatedAt = existing.CreatedAt
	record.InstalledBy = normalizePluginActor(existing.InstalledBy)
	record.UpdatedAt = now
	record.UpdatedBy = normalizePluginActor(actor)
	record.Access = normalizePluginAccess(record.Access, record.InstalledBy)
	record.Metadata = cloneStringMap(record.Metadata)
	record.Tools = cloneInstalledPluginTools(record.Tools)
	record.Capabilities = normalizeCapabilities(record.Capabilities)
	record.RuntimeError = strings.TrimSpace(record.RuntimeError)

	nextData := pluginCatalogState{
		Plugins:   cloneInstalledPluginRecords(s.data.Plugins),
		UpdatedAt: now,
	}
	nextData.Plugins[index] = cloneInstalledPluginRecord(record)
	slices.SortFunc(nextData.Plugins, compareInstalledPluginRecords)
	if err := s.saveStateLocked(nextData); err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	s.data = nextData
	return cloneInstalledPluginRecord(record), PluginCatalog{
		CurrentActor: normalizePluginActor(actor),
		Plugins:      cloneInstalledPluginRecords(s.data.Plugins),
	}, nil
}

func (s *PluginCatalogStore) Delete(id string, actor PluginActor) (InstalledPluginRecord, PluginCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := pluginIndexByID(s.data.Plugins, id)
	if index < 0 {
		return InstalledPluginRecord{}, PluginCatalog{}, fmt.Errorf("%w: %s", ErrPluginNotFound, strings.TrimSpace(id))
	}
	removed := cloneInstalledPluginRecord(s.data.Plugins[index])
	nextData := pluginCatalogState{
		Plugins:   cloneInstalledPluginRecords(s.data.Plugins),
		UpdatedAt: time.Now().UTC(),
	}
	nextData.Plugins = append(nextData.Plugins[:index], nextData.Plugins[index+1:]...)
	if err := s.saveStateLocked(nextData); err != nil {
		return InstalledPluginRecord{}, PluginCatalog{}, err
	}
	s.data = nextData
	return removed, PluginCatalog{
		CurrentActor: normalizePluginActor(actor),
		Plugins:      cloneInstalledPluginRecords(s.data.Plugins),
	}, nil
}

func (s *PluginCatalogStore) saveLocked() error {
	return s.saveStateLocked(s.data)
}

func (s *PluginCatalogStore) saveStateLocked(data pluginCatalogState) error {
	payload, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return atomicfile.WriteFile(s.path, payload, 0o600)
}

func normalizePluginActor(actor PluginActor) PluginActor {
	return PluginActor{
		Username: strings.TrimSpace(actor.Username),
		HomeDir:  strings.TrimSpace(actor.HomeDir),
	}
}

func normalizePluginAccess(access PluginAccessPolicy, owner PluginActor) PluginAccessPolicy {
	normalizedOwner := strings.TrimSpace(access.OwnerUsername)
	if normalizedOwner == "" {
		normalizedOwner = strings.TrimSpace(owner.Username)
	}
	normalized := PluginAccessPolicy{
		OwnerUsername: normalizedOwner,
		Visibility:    strings.TrimSpace(access.Visibility),
		AllowedUsers:  make([]string, 0, len(access.AllowedUsers)),
	}
	seen := make(map[string]struct{}, len(access.AllowedUsers))
	for _, raw := range access.AllowedUsers {
		user := strings.TrimSpace(raw)
		if user == "" {
			continue
		}
		if _, ok := seen[user]; ok {
			continue
		}
		seen[user] = struct{}{}
		normalized.AllowedUsers = append(normalized.AllowedUsers, user)
	}
	return normalized
}

func normalizeCapabilities(capabilities []string) []string {
	normalized := make([]string, 0, len(capabilities))
	seen := make(map[string]struct{}, len(capabilities))
	for _, raw := range capabilities {
		capability := strings.TrimSpace(raw)
		if capability == "" {
			continue
		}
		if _, ok := seen[capability]; ok {
			continue
		}
		seen[capability] = struct{}{}
		normalized = append(normalized, capability)
	}
	return normalized
}

func cloneInstalledPluginRecords(records []InstalledPluginRecord) []InstalledPluginRecord {
	cloned := make([]InstalledPluginRecord, 0, len(records))
	for _, record := range records {
		cloned = append(cloned, cloneInstalledPluginRecord(record))
	}
	return cloned
}

func cloneInstalledPluginRecord(record InstalledPluginRecord) InstalledPluginRecord {
	record.Capabilities = append([]string(nil), record.Capabilities...)
	record.Tools = cloneInstalledPluginTools(record.Tools)
	record.Metadata = cloneStringMap(record.Metadata)
	record.Access = normalizePluginAccess(record.Access, record.InstalledBy)
	record.Process.Args = append([]string(nil), record.Process.Args...)
	record.Process.Env = append([]string(nil), record.Process.Env...)
	return record
}

func cloneInstalledPluginTools(tools []InstalledPluginTool) []InstalledPluginTool {
	cloned := make([]InstalledPluginTool, 0, len(tools))
	for _, tool := range tools {
		cloned = append(cloned, InstalledPluginTool{
			Name:         strings.TrimSpace(tool.Name),
			Description:  strings.TrimSpace(tool.Description),
			InputSchema:  slices.Clone(tool.InputSchema),
			OutputSchema: slices.Clone(tool.OutputSchema),
			Capabilities: append([]string(nil), tool.Capabilities...),
			ApprovalTier: tool.ApprovalTier,
			Mutating:     tool.Mutating,
			TargetKind:   tool.TargetKind,
		})
	}
	return cloned
}

func cloneStringMap(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(values))
	for key, value := range values {
		name := strings.TrimSpace(key)
		if name == "" {
			continue
		}
		cloned[name] = value
	}
	return cloned
}

func pluginByID(records []InstalledPluginRecord, id string) (InstalledPluginRecord, bool) {
	for _, record := range records {
		if record.ID == strings.TrimSpace(id) {
			return record, true
		}
	}
	return InstalledPluginRecord{}, false
}

func pluginIndexByID(records []InstalledPluginRecord, id string) int {
	for index, record := range records {
		if record.ID == strings.TrimSpace(id) {
			return index
		}
	}
	return -1
}

func compareInstalledPluginRecords(left InstalledPluginRecord, right InstalledPluginRecord) int {
	leftName := strings.TrimSpace(left.DisplayName)
	if leftName == "" {
		leftName = left.ID
	}
	rightName := strings.TrimSpace(right.DisplayName)
	if rightName == "" {
		rightName = right.ID
	}
	switch {
	case leftName < rightName:
		return -1
	case leftName > rightName:
		return 1
	case left.ID < right.ID:
		return -1
	case left.ID > right.ID:
		return 1
	default:
		return 0
	}
}
