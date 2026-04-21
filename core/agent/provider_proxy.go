package agent

import (
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/aiproxy"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

func normalizeProxyProviderSettings(input CreateProxyProviderInput) ProxyProviderSettings {
	return ProxyProviderSettings{
		Model:    strings.TrimSpace(input.Model),
		Channels: normalizeProxyChannels(input.Channels),
	}
}

func applyProxyProviderUpdate(settings *ProxyProviderSettings, input UpdateProxyProviderInput) *ProxyProviderSettings {
	if settings == nil {
		settings = &ProxyProviderSettings{}
	}
	updated := &ProxyProviderSettings{
		Model:    settings.Model,
		Channels: aiproxy.CloneChannels(settings.Channels),
	}
	if input.Model != nil {
		updated.Model = strings.TrimSpace(*input.Model)
	}
	if input.Channels != nil && input.ReplaceChannels {
		updated.Channels = normalizeProxyChannels(*input.Channels)
	}
	return updated
}

func validateProxyProviderSettings(settings *ProxyProviderSettings) error {
	if settings == nil {
		return fmt.Errorf("%w: proxy settings are required", ErrProviderInvalidConfig)
	}
	if err := aiproxy.ValidateConfig(aiproxy.Config{
		Model:    settings.Model,
		Channels: settings.Channels,
	}); err != nil {
		return fmt.Errorf("%w: %v", ErrProviderInvalidConfig, err)
	}
	return nil
}

func normalizeProxyChannels(channels []aiproxy.Channel) []aiproxy.Channel {
	normalized := make([]aiproxy.Channel, 0, len(channels))
	for _, channel := range channels {
		channelCopy := channel
		if strings.TrimSpace(channelCopy.ID) == "" {
			channelCopy.ID = ids.New("proxy-channel")
		}
		channelCopy.Name = strings.TrimSpace(channelCopy.Name)
		channelCopy.ServiceType = aiproxy.ServiceType(strings.TrimSpace(string(channelCopy.ServiceType)))
		channelCopy.BaseURL = normalizeProviderBaseURL(channelCopy.BaseURL)
		for index, raw := range channelCopy.BaseURLs {
			channelCopy.BaseURLs[index] = normalizeProviderBaseURL(raw)
		}
		channelCopy.AuthType = aiproxy.AuthType(strings.TrimSpace(string(channelCopy.AuthType)))
		channelCopy.Status = aiproxy.ChannelStatus(strings.TrimSpace(string(channelCopy.Status)))
		channelCopy.Description = strings.TrimSpace(channelCopy.Description)
		if len(channelCopy.APIKeys) > 0 {
			keys := make([]aiproxy.APIKey, 0, len(channelCopy.APIKeys))
			for _, candidate := range channelCopy.APIKeys {
				keys = append(keys, aiproxy.APIKey{
					Key:     strings.TrimSpace(candidate.Key),
					Enabled: candidate.Enabled,
				})
			}
			channelCopy.APIKeys = keys
		}
		if channelCopy.ModelMapping != nil {
			cloned := make(map[string]string, len(channelCopy.ModelMapping))
			for key, value := range channelCopy.ModelMapping {
				key = strings.TrimSpace(key)
				value = strings.TrimSpace(value)
				if key == "" || value == "" {
					continue
				}
				cloned[key] = value
			}
			channelCopy.ModelMapping = cloned
		}
		normalized = append(normalized, channelCopy)
	}
	return normalized
}

func proxyProviderSettingsViewFromSettings(settings *ProxyProviderSettings) *ProxyProviderSettingsView {
	if settings == nil {
		return nil
	}
	view := &ProxyProviderSettingsView{
		Model:    settings.Model,
		Channels: make([]ProxyChannelSettingsView, 0, len(settings.Channels)),
	}
	for _, channel := range settings.Channels {
		channelView := ProxyChannelSettingsView{
			ID:                 channel.ID,
			Name:               channel.Name,
			ServiceType:        channel.ServiceType,
			BaseURL:            channel.BaseURL,
			BaseURLs:           append([]string(nil), channel.BaseURLs...),
			AuthType:           channel.AuthType,
			Priority:           channel.Priority,
			Status:             channel.Status,
			Description:        channel.Description,
			InsecureSkipVerify: channel.InsecureSkipVerify,
			KeyCount:           len(channel.APIKeys),
			EnabledKeyCount:    channel.EnabledAPIKeyCount(),
		}
		if channel.ModelMapping != nil {
			channelView.ModelMapping = make(map[string]string, len(channel.ModelMapping))
			for key, value := range channel.ModelMapping {
				channelView.ModelMapping[key] = value
			}
		}
		view.Channels = append(view.Channels, channelView)
	}
	return view
}

func cloneProxyProviderSettings(settings *ProxyProviderSettings) *ProxyProviderSettings {
	if settings == nil {
		return nil
	}
	return &ProxyProviderSettings{
		Model:    settings.Model,
		Channels: aiproxy.CloneChannels(settings.Channels),
	}
}
