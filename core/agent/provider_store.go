package agent

import (
	"fmt"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

const defaultOpenAIBaseURL = "https://api.openai.com/v1"
const defaultOpenAIModel = "gpt-4o-mini"

func (s *Store) ProvidersCatalog() ProviderCatalog {
	snapshot := s.Snapshot()
	return providerCatalogFromState(snapshot)
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
	record, err := buildProviderRecord(input)
	if err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.data.Providers = append(s.data.Providers, record)
	s.data.UpdatedAt = time.Now().UTC()
	if err := s.saveLocked(); err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	return providerViewFromRecord(record, s.data.ActiveProviderID), providerCatalogFromState(s.data), nil
}

func (s *Store) UpdateProvider(id string, input UpdateProviderInput) (ProviderView, ProviderCatalog, error) {
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
	if s.data.ActiveProviderID == updated.ID && !updated.Enabled {
		return ProviderView{}, ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderDisabled, updated.ID)
	}

	s.data.Providers[index] = updated
	s.data.UpdatedAt = time.Now().UTC()
	if err := s.saveLocked(); err != nil {
		return ProviderView{}, ProviderCatalog{}, err
	}
	return providerViewFromRecord(updated, s.data.ActiveProviderID), providerCatalogFromState(s.data), nil
}

func (s *Store) SetActiveProvider(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	provider, ok := findByID(s.data.Providers, id)
	if !ok {
		return fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	if !provider.Enabled {
		return fmt.Errorf("%w: %s", ErrProviderDisabled, id)
	}
	s.data.ActiveProviderID = id
	s.data.UpdatedAt = time.Now().UTC()
	return s.saveLocked()
}

func (s *Store) DeleteProvider(id string) (ProviderCatalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.providerIndexLocked(id)
	if index < 0 {
		return ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	if s.data.ActiveProviderID == id {
		return ProviderCatalog{}, fmt.Errorf("%w: %s", ErrProviderDeleteActive, id)
	}
	s.data.Providers = append(s.data.Providers[:index], s.data.Providers[index+1:]...)
	s.data.UpdatedAt = time.Now().UTC()
	if err := s.saveLocked(); err != nil {
		return ProviderCatalog{}, err
	}
	return providerCatalogFromState(s.data), nil
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
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if input.Enabled != nil {
		record.Enabled = *input.Enabled
	}

	switch kind {
	case ProviderKindOllama:
		if input.Ollama == nil || input.OpenAI != nil {
			return ProviderRecord{}, fmt.Errorf("%w: ollama config is required", ErrProviderInvalidConfig)
		}
		record.Ollama = &OllamaProviderSettings{
			BaseURL: normalizeProviderBaseURL(input.Ollama.BaseURL),
			Model:   strings.TrimSpace(input.Ollama.Model),
		}
	case ProviderKindOpenAI:
		if input.OpenAI == nil || input.Ollama != nil {
			return ProviderRecord{}, fmt.Errorf("%w: openai config is required", ErrProviderInvalidConfig)
		}
		record.OpenAI = &OpenAIProviderSettings{
			BaseURL:      normalizeProviderBaseURL(firstNonEmpty(input.OpenAI.BaseURL, defaultOpenAIBaseURL)),
			Model:        strings.TrimSpace(firstNonEmpty(input.OpenAI.Model, defaultOpenAIModel)),
			APIKeySecret: strings.TrimSpace(input.OpenAI.APIKey),
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

	switch updated.Kind {
	case ProviderKindOllama:
		if input.OpenAI != nil {
			return ProviderRecord{}, fmt.Errorf("%w: openai config does not match provider kind", ErrProviderInvalidConfig)
		}
		if input.Ollama != nil {
			if updated.Ollama == nil {
				updated.Ollama = &OllamaProviderSettings{}
			}
			if input.Ollama.BaseURL != nil {
				updated.Ollama.BaseURL = normalizeProviderBaseURL(*input.Ollama.BaseURL)
			}
			if input.Ollama.Model != nil {
				updated.Ollama.Model = strings.TrimSpace(*input.Ollama.Model)
			}
		}
	case ProviderKindOpenAI:
		if input.Ollama != nil {
			return ProviderRecord{}, fmt.Errorf("%w: ollama config does not match provider kind", ErrProviderInvalidConfig)
		}
		if input.OpenAI != nil {
			if updated.OpenAI == nil {
				updated.OpenAI = &OpenAIProviderSettings{}
			}
			if input.OpenAI.BaseURL != nil {
				updated.OpenAI.BaseURL = normalizeProviderBaseURL(*input.OpenAI.BaseURL)
			}
			if input.OpenAI.Model != nil {
				updated.OpenAI.Model = strings.TrimSpace(*input.OpenAI.Model)
			}
			if input.OpenAI.ClearAPIKey {
				updated.OpenAI.APIKeySecret = ""
			}
			if input.OpenAI.APIKey != nil {
				updated.OpenAI.APIKeySecret = strings.TrimSpace(*input.OpenAI.APIKey)
			}
		}
	default:
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderKindUnsupported, updated.Kind)
	}

	updated.UpdatedAt = time.Now().UTC()
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
	switch record.Kind {
	case ProviderKindOllama:
		if record.Ollama == nil || record.OpenAI != nil {
			return fmt.Errorf("%w: ollama settings are required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.Ollama.BaseURL) == "" {
			return fmt.Errorf("%w: ollama base_url is required", ErrProviderInvalidConfig)
		}
	case ProviderKindOpenAI:
		if record.OpenAI == nil || record.Ollama != nil {
			return fmt.Errorf("%w: openai settings are required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.OpenAI.BaseURL) == "" {
			return fmt.Errorf("%w: openai base_url is required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.OpenAI.Model) == "" {
			return fmt.Errorf("%w: openai model is required", ErrProviderInvalidConfig)
		}
		if strings.TrimSpace(record.OpenAI.APIKeySecret) == "" {
			return fmt.Errorf("%w: openai api_key is required", ErrProviderInvalidConfig)
		}
	default:
		return fmt.Errorf("%w: %s", ErrProviderKindUnsupported, record.Kind)
	}
	return nil
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
	case ProviderKindOpenAI:
		return "OpenAI"
	default:
		return "Ollama"
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
