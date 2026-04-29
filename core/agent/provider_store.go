package agent

import (
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

const defaultCodexModel = "gpt-5.4"
const defaultCodexCommand = "codex"
const defaultClaudeModel = "sonnet"
const defaultClaudeCommand = "claude"

func (s *Store) ProvidersCatalog() ProviderCatalog {
	return s.ProvidersCatalogWithActor(ProviderActor{})
}

func (s *Store) ProvidersCatalogWithActor(actor ProviderActor) ProviderCatalog {
	snapshot := s.Snapshot()
	return providerCatalogFromStateWithActor(snapshot, actor)
}

func (s *Store) ActiveProvider() (ProviderRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	provider, ok := findByID(s.data.Providers, s.data.ActiveProviderID)
	if !ok {
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderNotFound, s.data.ActiveProviderID)
	}
	return cloneProviderRecord(provider), nil
}

func (s *Store) CreateProvider(input CreateProviderInput) (ProviderView, ProviderCatalog, error) {
	return s.CreateProviderWithActor(input, ProviderActor{})
}

func (s *Store) CreateProviderWithActor(input CreateProviderInput, actor ProviderActor) (ProviderView, ProviderCatalog, error) {
	record, err := buildProviderRecord(input)
	if err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	record.CreatedBy = normalizeProviderActor(actor)
	record.UpdatedBy = normalizeProviderActor(actor)
	record.Access = normalizeProviderAccess(record.Access, record.CreatedBy)

	s.mu.Lock()
	defer s.mu.Unlock()

	nextData := cloneState(s.data)
	nextData.Providers = append(nextData.Providers, record)
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	s.data = nextData
	return providerViewFromRecord(record, s.data.ActiveProviderID), providerCatalogFromStateWithActor(s.data, actor), nil
}

func (s *Store) UpdateProvider(id string, input UpdateProviderInput) (ProviderView, ProviderCatalog, error) {
	return s.UpdateProviderWithActor(id, input, ProviderActor{})
}

func (s *Store) UpdateProviderWithActor(id string, input UpdateProviderInput, actor ProviderActor) (ProviderView, ProviderCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.providerIndexLocked(id)
	if index < 0 {
		return ProviderView{}, ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	updated, err := applyProviderUpdate(s.data.Providers[index], input)
	if err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	updated.UpdatedBy = normalizeProviderActor(actor)
	if s.data.ActiveProviderID == updated.ID && !updated.Enabled {
		return ProviderView{}, ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderDisabled, updated.ID)
	}

	nextData := cloneState(s.data)
	nextData.Providers[index] = updated
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	s.data = nextData
	return providerViewFromRecord(updated, s.data.ActiveProviderID), providerCatalogFromStateWithActor(s.data, actor), nil
}

func (s *Store) SetActiveProvider(id string) error {
	return s.SetActiveProviderWithActor(id, ProviderActor{})
}

func (s *Store) SetActiveProviderWithActor(id string, actor ProviderActor) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	provider, ok := findByID(s.data.Providers, id)
	if !ok {
		return fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	if !provider.Enabled {
		return fmt.Errorf("%w: %s", ErrProviderDisabled, id)
	}
	nextData := cloneState(s.data)
	nextData.ActiveProviderID = id
	nextData.UpdatedAt = time.Now().UTC()
	index := s.providerIndexLocked(id)
	if index >= 0 {
		provider := cloneProviderRecord(nextData.Providers[index])
		provider.UpdatedBy = normalizeProviderActor(actor)
		provider.UpdatedAt = time.Now().UTC()
		nextData.Providers[index] = provider
	}
	if err := s.saveStateLocked(nextData); err != nil {
		return err
	}
	s.data = nextData
	return nil
}

func (s *Store) DeleteProvider(id string) (ProviderCatalog, error) {
	return s.DeleteProviderWithActor(id, ProviderActor{})
}

func (s *Store) DeleteProviderWithActor(id string, actor ProviderActor) (ProviderCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.providerIndexLocked(id)
	if index < 0 {
		return ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	if s.data.ActiveProviderID == id {
		return ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderDeleteActive, id)
	}
	nextData := cloneState(s.data)
	nextData.Providers = append(nextData.Providers[:index], nextData.Providers[index+1:]...)
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return ProviderCatalog{}, err
	}
	s.data = nextData
	return providerCatalogFromStateWithActor(s.data, actor), nil
}

func buildProviderRecord(input CreateProviderInput) (ProviderRecord, error) {
	kind := ProviderKind(strings.TrimSpace(string(input.Kind)))
	if !isSupportedProviderKind(kind) {
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderKindUnsupported, input.Kind)
	}

	now := time.Now().UTC()
	record := ProviderRecord{
		ID:          ids.New("provider"),
		Kind:        kind,
		DisplayName: defaultProviderDisplayName(kind, input.DisplayName),
		Enabled:     true,
		Access:      normalizeProviderAccess(input.Access, ProviderActor{}),
		RoutePolicy: normalizeProviderRoutePolicy(derefProviderRoutePolicy(input.RoutePolicy)),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if input.Enabled != nil {
		record.Enabled = *input.Enabled
	}
	record.CreatedBy = normalizeProviderActor(ProviderActor{})
	record.UpdatedBy = normalizeProviderActor(ProviderActor{})

	switch kind {
	case ProviderKindCodex:
		if input.Codex == nil || input.Claude != nil || input.OpenAICompatible != nil {
			return ProviderRecord{}, fmt.Errorf("%w: codex config is required", ErrProviderInvalidConfig)
		}
		record.Codex = &CodexProviderSettings{
			Command: strings.TrimSpace(firstNonEmpty(input.Codex.Command, defaultCodexCommand)),
			Model:   strings.TrimSpace(firstNonEmpty(input.Codex.Model, defaultCodexModel)),
			ChatModels: normalizeProviderChatModels(
				firstNonEmpty(input.Codex.Model, defaultCodexModel),
				input.Codex.ChatModels,
			),
		}
	case ProviderKindClaude:
		if input.Claude == nil || input.Codex != nil || input.OpenAICompatible != nil {
			return ProviderRecord{}, fmt.Errorf("%w: claude config is required", ErrProviderInvalidConfig)
		}
		record.Claude = &ClaudeProviderSettings{
			Command: strings.TrimSpace(firstNonEmpty(input.Claude.Command, defaultClaudeCommand)),
			Model:   strings.TrimSpace(firstNonEmpty(input.Claude.Model, defaultClaudeModel)),
			ChatModels: normalizeProviderChatModels(
				firstNonEmpty(input.Claude.Model, defaultClaudeModel),
				input.Claude.ChatModels,
			),
		}
	case ProviderKindOpenAICompatible:
		if input.OpenAICompatible == nil || input.Codex != nil || input.Claude != nil {
			return ProviderRecord{}, fmt.Errorf("%w: openai-compatible config is required", ErrProviderInvalidConfig)
		}
		record.OpenAICompatible = &OpenAICompatibleProviderSettings{
			BaseURL: normalizeProviderBaseURL(input.OpenAICompatible.BaseURL),
			Model:   strings.TrimSpace(input.OpenAICompatible.Model),
			ChatModels: normalizeProviderChatModels(
				input.OpenAICompatible.Model,
				input.OpenAICompatible.ChatModels,
			),
		}
	default:
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderKindUnsupported, input.Kind)
	}

	if err := validateProviderRecord(record); err != nil {
		return ProviderRecord{}, err
	}
	return record, nil
}

func applyProviderUpdate(record ProviderRecord, input UpdateProviderInput) (ProviderRecord, error) {
	updated := cloneProviderRecord(record)
	if input.DisplayName != nil {
		updated.DisplayName = defaultProviderDisplayName(updated.Kind, *input.DisplayName)
	}
	if input.Enabled != nil {
		updated.Enabled = *input.Enabled
	}
	if input.Access != nil {
		updated.Access = normalizeProviderAccess(*input.Access, updated.CreatedBy)
	}
	if input.RoutePolicy != nil {
		updated.RoutePolicy = normalizeProviderRoutePolicy(*input.RoutePolicy)
	}

	switch updated.Kind {
	case ProviderKindCodex:
		if input.Claude != nil || input.OpenAICompatible != nil {
			return ProviderRecord{}, fmt.Errorf("%w: codex config does not match provider kind", ErrProviderInvalidConfig)
		}
		if input.Codex != nil {
			if updated.Codex == nil {
				updated.Codex = &CodexProviderSettings{}
			}
			if input.Codex.Command != nil {
				updated.Codex.Command = strings.TrimSpace(*input.Codex.Command)
			}
			if input.Codex.Model != nil {
				updated.Codex.Model = strings.TrimSpace(*input.Codex.Model)
			}
			if input.Codex.ChatModels != nil {
				updated.Codex.ChatModels = normalizeProviderChatModels(updated.Codex.Model, *input.Codex.ChatModels)
			} else {
				updated.Codex.ChatModels = normalizeProviderChatModels(updated.Codex.Model, updated.Codex.ChatModels)
			}
			if strings.TrimSpace(updated.Codex.Command) == "" {
				updated.Codex.Command = defaultCodexCommand
			}
			if strings.TrimSpace(updated.Codex.Model) == "" {
				updated.Codex.Model = defaultCodexModel
			}
		}
	case ProviderKindClaude:
		if input.Codex != nil || input.OpenAICompatible != nil {
			return ProviderRecord{}, fmt.Errorf("%w: claude config does not match provider kind", ErrProviderInvalidConfig)
		}
		if input.Claude != nil {
			if updated.Claude == nil {
				updated.Claude = &ClaudeProviderSettings{}
			}
			if input.Claude.Command != nil {
				updated.Claude.Command = strings.TrimSpace(*input.Claude.Command)
			}
			if input.Claude.Model != nil {
				updated.Claude.Model = strings.TrimSpace(*input.Claude.Model)
			}
			if input.Claude.ChatModels != nil {
				updated.Claude.ChatModels = normalizeProviderChatModels(updated.Claude.Model, *input.Claude.ChatModels)
			} else {
				updated.Claude.ChatModels = normalizeProviderChatModels(updated.Claude.Model, updated.Claude.ChatModels)
			}
			if strings.TrimSpace(updated.Claude.Command) == "" {
				updated.Claude.Command = defaultClaudeCommand
			}
			if strings.TrimSpace(updated.Claude.Model) == "" {
				updated.Claude.Model = defaultClaudeModel
			}
		}
	case ProviderKindOpenAICompatible:
		if input.Codex != nil || input.Claude != nil {
			return ProviderRecord{}, fmt.Errorf(
				"%w: openai-compatible config does not match provider kind",
				ErrProviderInvalidConfig,
			)
		}
		if input.OpenAICompatible != nil {
			if updated.OpenAICompatible == nil {
				updated.OpenAICompatible = &OpenAICompatibleProviderSettings{}
			}
			if input.OpenAICompatible.BaseURL != nil {
				updated.OpenAICompatible.BaseURL = normalizeProviderBaseURL(*input.OpenAICompatible.BaseURL)
			}
			if input.OpenAICompatible.Model != nil {
				updated.OpenAICompatible.Model = strings.TrimSpace(*input.OpenAICompatible.Model)
			}
			if input.OpenAICompatible.ChatModels != nil {
				updated.OpenAICompatible.ChatModels = normalizeProviderChatModels(
					updated.OpenAICompatible.Model,
					*input.OpenAICompatible.ChatModels,
				)
			} else {
				updated.OpenAICompatible.ChatModels = normalizeProviderChatModels(
					updated.OpenAICompatible.Model,
					updated.OpenAICompatible.ChatModels,
				)
			}
		}
	default:
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderKindUnsupported, updated.Kind)
	}

	updated.UpdatedAt = time.Now().UTC()
	updated.Access = normalizeProviderAccess(updated.Access, updated.CreatedBy)
	updated.RoutePolicy = normalizeProviderRoutePolicy(updated.RoutePolicy)
	if err := validateProviderRecord(updated); err != nil {
		return ProviderRecord{}, err
	}
	return updated, nil
}

func validateProviderRecord(record ProviderRecord) error {
	if strings.TrimSpace(record.ID) == "" {
		return fmt.Errorf("%w: provider id is required", ErrProviderInvalidConfig)
	}
	if !isSupportedProviderKind(record.Kind) {
		return fmt.Errorf("%w: %s", ErrProviderKindUnsupported, record.Kind)
	}
	if strings.TrimSpace(record.DisplayName) == "" {
		return fmt.Errorf("%w: display name is required", ErrProviderInvalidConfig)
	}
	record.Access = normalizeProviderAccess(record.Access, record.CreatedBy)
	record.RoutePolicy = normalizeProviderRoutePolicy(record.RoutePolicy)
	switch record.Kind {
	case ProviderKindCodex:
		if record.Codex == nil || record.Claude != nil || record.OpenAICompatible != nil {
			return fmt.Errorf("%w: codex settings are required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Codex.Command) == "" {
			return fmt.Errorf("%w: codex command is required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Codex.Model) == "" {
			return fmt.Errorf("%w: codex model is required", ErrProviderInvalidConfig)
		}
	case ProviderKindClaude:
		if record.Claude == nil || record.Codex != nil || record.OpenAICompatible != nil {
			return fmt.Errorf("%w: claude settings are required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Claude.Command) == "" {
			return fmt.Errorf("%w: claude command is required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Claude.Model) == "" {
			return fmt.Errorf("%w: claude model is required", ErrProviderInvalidConfig)
		}
	case ProviderKindOpenAICompatible:
		if record.OpenAICompatible == nil || record.Codex != nil || record.Claude != nil {
			return fmt.Errorf("%w: openai-compatible settings are required", ErrProviderInvalidConfig)
		}
		if normalizeProviderBaseURL(record.OpenAICompatible.BaseURL) == "" {
			return fmt.Errorf("%w: openai-compatible base_url is required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.OpenAICompatible.Model) == "" {
			return fmt.Errorf("%w: openai-compatible model is required", ErrProviderInvalidConfig)
		}
	default:
		return fmt.Errorf("%w: %s", ErrProviderKindUnsupported, record.Kind)
	}
	return nil
}

func derefProviderRoutePolicy(policy *ProviderRoutePolicy) ProviderRoutePolicy {
	if policy == nil {
		return ProviderRoutePolicy{}
	}
	return *policy
}

func isSupportedProviderKind(kind ProviderKind) bool {
	for _, supported := range SupportedProviderKinds() {
		if supported == kind {
			return true
		}
	}
	return false
}

func defaultProviderDisplayName(kind ProviderKind, raw string) string {
	if name := strings.TrimSpace(raw); name != "" {
		return name
	}
	switch kind {
	case ProviderKindCodex:
		return "Codex CLI"
	case ProviderKindClaude:
		return "Claude Code CLI"
	case ProviderKindOpenAICompatible:
		return "OpenAI-Compatible HTTP"
	default:
		return "Provider"
	}
}

func normalizeProviderState(state State) (State, bool) {
	normalized := cloneState(state)
	changed := false

	if normalized.Version != ConfigVersion {
		normalized.Version = ConfigVersion
		changed = true
	}
	if len(normalized.Providers) == 0 {
		normalized.Providers = defaultProviders()
		normalized.ActiveProviderID = defaultActiveProviderID()
		changed = true
	}
	filteredProviders := make([]ProviderRecord, 0, len(normalized.Providers))
	for _, provider := range normalized.Providers {
		if isSupportedProviderKind(provider.Kind) {
			filteredProviders = append(filteredProviders, provider)
		}
	}
	if len(filteredProviders) != len(normalized.Providers) {
		normalized.Providers = filteredProviders
		changed = true
	}
	if len(normalized.Providers) == 0 {
		normalized.Providers = defaultProviders()
		normalized.ActiveProviderID = defaultActiveProviderID()
		changed = true
	}
	for index := range normalized.Providers {
		nextProvider := normalizeProviderRecord(normalized.Providers[index])
		if !reflect.DeepEqual(nextProvider, normalized.Providers[index]) {
			normalized.Providers[index] = nextProvider
			changed = true
		}
	}
	if strings.TrimSpace(normalized.ActiveProviderID) == "" {
		normalized.ActiveProviderID = selectDefaultActiveProviderID(normalized.Providers)
		changed = true
	}
	if _, ok := findByID(normalized.Providers, normalized.ActiveProviderID); !ok {
		normalized.ActiveProviderID = selectDefaultActiveProviderID(normalized.Providers)
		changed = true
	}
	return normalized, changed
}

func selectDefaultActiveProviderID(providers []ProviderRecord) string {
	for _, provider := range providers {
		if provider.Enabled {
			return provider.ID
		}
	}
	if len(providers) > 0 {
		return providers[0].ID
	}
	return defaultActiveProviderID()
}

func (s *Store) providerIndexLocked(id string) int {
	for index := range s.data.Providers {
		if s.data.Providers[index].ID == id {
			return index
		}
	}
	return -1
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func normalizeProviderRecord(record ProviderRecord) ProviderRecord {
	normalized := cloneProviderRecord(record)
	if normalized.Codex != nil {
		if strings.TrimSpace(normalized.Codex.Command) == "" {
			normalized.Codex.Command = defaultCodexCommand
		}
		if strings.TrimSpace(normalized.Codex.Model) == "" {
			normalized.Codex.Model = defaultCodexModel
		}
		normalized.Codex.ChatModels = normalizeProviderChatModels(
			normalized.Codex.Model,
			normalized.Codex.ChatModels,
		)
	}
	if normalized.Claude != nil {
		if strings.TrimSpace(normalized.Claude.Command) == "" {
			normalized.Claude.Command = defaultClaudeCommand
		}
		if strings.TrimSpace(normalized.Claude.Model) == "" {
			normalized.Claude.Model = defaultClaudeModel
		}
		normalized.Claude.ChatModels = normalizeProviderChatModels(
			normalized.Claude.Model,
			normalized.Claude.ChatModels,
		)
	}
	if normalized.OpenAICompatible != nil {
		normalized.OpenAICompatible.BaseURL = normalizeProviderBaseURL(normalized.OpenAICompatible.BaseURL)
		normalized.OpenAICompatible.ChatModels = normalizeProviderChatModels(
			normalized.OpenAICompatible.Model,
			normalized.OpenAICompatible.ChatModels,
		)
	}
	return normalized
}

func normalizeProviderChatModels(defaultModel string, rawModels []string) []string {
	models := make([]string, 0, len(rawModels)+1)
	seen := make(map[string]struct{}, len(rawModels)+1)

	appendModel := func(raw string) {
		model := strings.TrimSpace(raw)
		if model == "" {
			return
		}
		if _, ok := seen[model]; ok {
			return
		}
		seen[model] = struct{}{}
		models = append(models, model)
	}

	appendModel(defaultModel)
	for _, rawModel := range rawModels {
		appendModel(rawModel)
	}

	if len(models) == 0 {
		return nil
	}
	return models
}
