package aiproxy

import (
	"fmt"
	"slices"
	"strings"
)

type ServiceType string

const (
	ServiceTypeOpenAI ServiceType = "openai"
	ServiceTypeClaude ServiceType = "claude"
	ServiceTypeGemini ServiceType = "gemini"
)

type AuthType string

const (
	AuthTypeBearer     AuthType = "bearer"
	AuthTypeAPIKey     AuthType = "x-api-key"
	AuthTypeBoth       AuthType = "both"
	AuthTypeGoogAPIKey AuthType = "x-goog-api-key"
)

type ChannelStatus string

const (
	ChannelStatusActive    ChannelStatus = "active"
	ChannelStatusSuspended ChannelStatus = "suspended"
	ChannelStatusDisabled  ChannelStatus = "disabled"
)

type APIKey struct {
	Key     string `json:"key,omitempty"`
	Enabled bool   `json:"enabled"`
}

type Channel struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	ServiceType        ServiceType       `json:"service_type"`
	BaseURL            string            `json:"base_url,omitempty"`
	BaseURLs           []string          `json:"base_urls,omitempty"`
	APIKeys            []APIKey          `json:"api_keys,omitempty"`
	AuthType           AuthType          `json:"auth_type,omitempty"`
	Priority           int               `json:"priority,omitempty"`
	Status             ChannelStatus     `json:"status,omitempty"`
	ModelMapping       map[string]string `json:"model_mapping,omitempty"`
	Description        string            `json:"description,omitempty"`
	InsecureSkipVerify bool              `json:"insecure_skip_verify,omitempty"`
}

type Config struct {
	Model    string    `json:"model"`
	Channels []Channel `json:"channels"`
}

func SupportedServiceTypes() []ServiceType {
	return []ServiceType{
		ServiceTypeOpenAI,
		ServiceTypeClaude,
		ServiceTypeGemini,
	}
}

func SupportedAuthTypes() []AuthType {
	return []AuthType{
		AuthTypeBearer,
		AuthTypeAPIKey,
		AuthTypeBoth,
		AuthTypeGoogAPIKey,
	}
}

func CloneConfig(config Config) Config {
	return Config{
		Model:    strings.TrimSpace(config.Model),
		Channels: CloneChannels(config.Channels),
	}
}

func CloneChannels(channels []Channel) []Channel {
	if len(channels) == 0 {
		return nil
	}
	cloned := make([]Channel, 0, len(channels))
	for _, channel := range channels {
		channelCopy := channel
		channelCopy.BaseURLs = slices.Clone(channel.BaseURLs)
		if len(channel.APIKeys) > 0 {
			channelCopy.APIKeys = make([]APIKey, len(channel.APIKeys))
			copy(channelCopy.APIKeys, channel.APIKeys)
		}
		if channel.ModelMapping != nil {
			channelCopy.ModelMapping = make(map[string]string, len(channel.ModelMapping))
			for key, value := range channel.ModelMapping {
				channelCopy.ModelMapping[key] = value
			}
		}
		cloned = append(cloned, channelCopy)
	}
	return cloned
}

func (channel Channel) EnabledAPIKeys() []string {
	if len(channel.APIKeys) == 0 {
		return nil
	}
	keys := make([]string, 0, len(channel.APIKeys))
	for _, candidate := range channel.APIKeys {
		if !candidate.Enabled {
			continue
		}
		key := strings.TrimSpace(candidate.Key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	return keys
}

func (channel Channel) EnabledAPIKeyCount() int {
	return len(channel.EnabledAPIKeys())
}

func (channel Channel) GetAllBaseURLs() []string {
	baseURLs := make([]string, 0, len(channel.BaseURLs)+1)
	if base := strings.TrimSpace(channel.BaseURL); base != "" {
		baseURLs = append(baseURLs, strings.TrimRight(base, "/"))
	}
	for _, raw := range channel.BaseURLs {
		base := strings.TrimSpace(raw)
		if base == "" {
			continue
		}
		base = strings.TrimRight(base, "/")
		if !slices.Contains(baseURLs, base) {
			baseURLs = append(baseURLs, base)
		}
	}
	return baseURLs
}

func (channel Channel) EffectiveStatus() ChannelStatus {
	status := ChannelStatus(strings.TrimSpace(string(channel.Status)))
	if status == "" {
		return ChannelStatusActive
	}
	return status
}

func (channel Channel) EffectiveAuthType() AuthType {
	authType := AuthType(strings.TrimSpace(string(channel.AuthType)))
	if authType != "" {
		return authType
	}
	switch channel.ServiceType {
	case ServiceTypeClaude:
		return AuthTypeAPIKey
	case ServiceTypeGemini:
		return AuthTypeGoogAPIKey
	default:
		return AuthTypeBearer
	}
}

func (channel Channel) MapModel(model string) string {
	model = strings.TrimSpace(model)
	if channel.ModelMapping == nil || model == "" {
		return model
	}
	if mapped := strings.TrimSpace(channel.ModelMapping[model]); mapped != "" {
		return mapped
	}
	return model
}

func ValidateConfig(config Config) error {
	if strings.TrimSpace(config.Model) == "" {
		return fmt.Errorf("proxy model is required")
	}
	if len(config.Channels) == 0 {
		return fmt.Errorf("at least one proxy channel is required")
	}
	for index, channel := range config.Channels {
		if err := ValidateChannel(channel); err != nil {
			return fmt.Errorf("channel %d: %w", index, err)
		}
	}
	return nil
}

func ValidateChannel(channel Channel) error {
	if strings.TrimSpace(channel.ID) == "" {
		return fmt.Errorf("channel id is required")
	}
	if strings.TrimSpace(channel.Name) == "" {
		return fmt.Errorf("channel name is required")
	}
	if !isSupportedServiceType(channel.ServiceType) {
		return fmt.Errorf("unsupported service type: %s", channel.ServiceType)
	}
	if len(channel.GetAllBaseURLs()) == 0 {
		return fmt.Errorf("channel base_url is required")
	}
	if !isSupportedAuthType(channel.EffectiveAuthType()) {
		return fmt.Errorf("unsupported auth type: %s", channel.AuthType)
	}
	switch channel.EffectiveStatus() {
	case ChannelStatusActive, ChannelStatusSuspended, ChannelStatusDisabled:
	default:
		return fmt.Errorf("unsupported channel status: %s", channel.Status)
	}
	return nil
}

func isSupportedServiceType(serviceType ServiceType) bool {
	for _, supported := range SupportedServiceTypes() {
		if supported == serviceType {
			return true
		}
	}
	return false
}

func isSupportedAuthType(authType AuthType) bool {
	for _, supported := range SupportedAuthTypes() {
		if supported == authType {
			return true
		}
	}
	return false
}
