package policy

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

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type Store struct {
	mu   sync.RWMutex
	path string
	cfg  Config
}

func NewStore(path string, repoRoot string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	store := &Store{path: path}
	if err := store.load(repoRoot); err != nil {
		return nil, err
	}
	return store, nil
}

func defaultConfig(repoRoot string) Config {
	cfg := Config{
		Version: ConfigVersion,
		AllowedRoots: []string{
			filepath.Clean(repoRoot),
		},
		DefaultCapabilities: []string{
			"connections:read",
			"connections:write",
			"workspace:read",
			"widget:focus",
			"terminal:read",
			"terminal:input",
			"policy:read",
			"policy:write",
			"audit:read",
		},
	}
	cfg.IgnoreRules = defaultIgnoreRules()
	return cfg
}

func (s *Store) load(repoRoot string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	payload, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.cfg = defaultConfig(repoRoot)
			return s.saveLocked()
		}
		return err
	}
	if err := json.Unmarshal(payload, &s.cfg); err != nil {
		return err
	}
	if s.cfg.Version == "" {
		s.cfg.Version = ConfigVersion
	}
	return nil
}

func (s *Store) saveLocked() error {
	return s.saveConfigLocked(s.cfg)
}

func (s *Store) saveConfigLocked(cfg Config) error {
	payload, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, payload, 0o600)
}

func (s *Store) Snapshot() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneConfig(s.cfg)
}

func (s *Store) AddTrustedRule(rule TrustedRule) (TrustedRule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rule.ID == "" {
		rule.ID = ids.New("trusted")
	}
	if rule.CreatedAt.IsZero() {
		rule.CreatedAt = time.Now().UTC()
	}
	if !rule.Enabled {
		rule.Enabled = true
	}
	if err := validateTrustedRule(rule); err != nil {
		return TrustedRule{}, fmt.Errorf("%w: %v", ErrInvalidTrustedRule, err)
	}
	nextCfg := cloneConfig(s.cfg)
	nextCfg.TrustedRules = append(nextCfg.TrustedRules, rule)
	if err := s.saveConfigLocked(nextCfg); err != nil {
		return TrustedRule{}, err
	}
	s.cfg = nextCfg
	return rule, nil
}

func (s *Store) ListTrustedRules() []TrustedRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.cfg.TrustedRules)
}

func (s *Store) RemoveTrustedRule(id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var next []TrustedRule
	removed := false
	for _, rule := range s.cfg.TrustedRules {
		if rule.ID == id {
			removed = true
			continue
		}
		next = append(next, rule)
	}
	if !removed {
		return false, nil
	}
	nextCfg := cloneConfig(s.cfg)
	nextCfg.TrustedRules = next
	if err := s.saveConfigLocked(nextCfg); err != nil {
		return false, err
	}
	s.cfg = nextCfg
	return true, nil
}

func (s *Store) AddIgnoreRule(rule IgnoreRule) (IgnoreRule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rule.ID == "" {
		rule.ID = ids.New("ignore")
	}
	if rule.CreatedAt.IsZero() {
		rule.CreatedAt = time.Now().UTC()
	}
	if !rule.Enabled {
		rule.Enabled = true
	}
	if err := validateIgnoreRule(rule); err != nil {
		return IgnoreRule{}, fmt.Errorf("%w: %v", ErrInvalidIgnoreRule, err)
	}
	nextCfg := cloneConfig(s.cfg)
	nextCfg.IgnoreRules = append(nextCfg.IgnoreRules, rule)
	if err := s.saveConfigLocked(nextCfg); err != nil {
		return IgnoreRule{}, err
	}
	s.cfg = nextCfg
	return rule, nil
}

func (s *Store) ListIgnoreRules() []IgnoreRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.cfg.IgnoreRules)
}

func (s *Store) RemoveIgnoreRule(id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var next []IgnoreRule
	removed := false
	for _, rule := range s.cfg.IgnoreRules {
		if rule.ID == id {
			removed = true
			continue
		}
		next = append(next, rule)
	}
	if !removed {
		return false, nil
	}
	nextCfg := cloneConfig(s.cfg)
	nextCfg.IgnoreRules = next
	if err := s.saveConfigLocked(nextCfg); err != nil {
		return false, err
	}
	s.cfg = nextCfg
	return true, nil
}

func cloneConfig(cfg Config) Config {
	cfg.AllowedRoots = slices.Clone(cfg.AllowedRoots)
	cfg.DefaultCapabilities = slices.Clone(cfg.DefaultCapabilities)
	cfg.TrustedRules = slices.Clone(cfg.TrustedRules)
	cfg.IgnoreRules = slices.Clone(cfg.IgnoreRules)
	return cfg
}

func defaultIgnoreRules() []IgnoreRule {
	specs := []struct {
		pattern string
		mode    IgnoreMode
	}{
		{pattern: ".env", mode: IgnoreModeMetadataOnly},
		{pattern: ".env.*", mode: IgnoreModeMetadataOnly},
		{pattern: "secrets.*", mode: IgnoreModeMetadataOnly},
		{pattern: "*.pem", mode: IgnoreModeDeny},
		{pattern: "*.key", mode: IgnoreModeDeny},
		{pattern: "*.p12", mode: IgnoreModeDeny},
		{pattern: "id_rsa", mode: IgnoreModeDeny},
		{pattern: "id_ed25519", mode: IgnoreModeDeny},
	}

	rules := make([]IgnoreRule, 0, len(specs))
	now := time.Now().UTC()
	for _, spec := range specs {
		rules = append(rules, IgnoreRule{
			ID:          ids.New("ignore"),
			Scope:       ScopeGlobal,
			MatcherType: MatcherGlob,
			Pattern:     spec.pattern,
			Mode:        spec.mode,
			CreatedAt:   now,
			Enabled:     true,
			Note:        "default secret protection",
		})
	}
	return rules
}

func validateTrustedRule(rule TrustedRule) error {
	if rule.Scope != ScopeGlobal && rule.Scope != ScopeWorkspace && rule.Scope != ScopeRepo {
		return errors.New("invalid trusted rule scope")
	}
	if rule.MatcherType == MatcherStructured {
		if rule.Structured == nil {
			return errors.New("structured matcher requires structured payload")
		}
	} else if strings.TrimSpace(rule.Matcher) == "" {
		return errors.New("trusted rule matcher is required")
	}
	switch rule.SubjectType {
	case SubjectTool, SubjectCommand, SubjectPath:
	default:
		return errors.New("invalid trusted rule subject")
	}
	return nil
}

func validateIgnoreRule(rule IgnoreRule) error {
	if rule.Scope != ScopeGlobal && rule.Scope != ScopeWorkspace && rule.Scope != ScopeRepo {
		return errors.New("invalid ignore rule scope")
	}
	if rule.MatcherType != MatcherExact && rule.MatcherType != MatcherGlob && rule.MatcherType != MatcherRegex {
		return errors.New("invalid ignore matcher type")
	}
	if strings.TrimSpace(rule.Pattern) == "" {
		return errors.New("ignore rule pattern is required")
	}
	if rule.Mode != IgnoreModeDeny && rule.Mode != IgnoreModeMetadataOnly && rule.Mode != IgnoreModeRedact {
		return errors.New("invalid ignore mode")
	}
	return nil
}
