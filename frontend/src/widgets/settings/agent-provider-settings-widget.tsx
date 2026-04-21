import { useCallback, useId } from 'react'

import type { AgentProviderKind } from '@/features/agent/api/provider-client'
import {
  type AgentProviderDraft,
  createEmptyProxyChannelDraft,
} from '@/features/agent/model/provider-settings-draft'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import {
  Box,
  Button,
  Checkbox,
  Input,
  Label,
  ScrollArea,
  Select,
  Surface,
  Text,
  TextArea,
} from '@/shared/ui/primitives'
import {
  providerSettingsActionsBarStyle,
  providerSettingsActionsGroupStyle,
  providerSettingsBodyStyle,
  providerSettingsChannelActionsStyle,
  providerSettingsChannelCardStyle,
  providerSettingsChannelHeaderStyle,
  providerSettingsChannelMetaStyle,
  providerSettingsEditorScrollStyle,
  providerSettingsEditorStyle,
  providerSettingsErrorMessageStyle,
  providerSettingsFieldStyle,
  providerSettingsGridStyle,
  providerSettingsInlineCheckboxStyle,
  providerSettingsListCardMetaStyle,
  providerSettingsListCardStyle,
  providerSettingsListStyle,
  providerSettingsRootStyle,
  providerSettingsSectionHeaderStyle,
  providerSettingsSectionStyle,
  providerSettingsSidebarStyle,
  providerSettingsStatusMessageStyle,
  providerSettingsToolbarActionsStyle,
  providerSettingsToolbarMetaStyle,
  providerSettingsToolbarStyle,
} from '@/widgets/settings/agent-provider-settings-widget.styles'

const kindLabels: Record<AgentProviderKind, string> = {
  ollama: 'Ollama',
  codex: 'Codex',
  openai: 'OpenAI-compatible',
  proxy: 'AI Proxy',
}

const defaultSupportedKinds: AgentProviderKind[] = ['ollama', 'codex', 'openai', 'proxy']

function TextInputField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: string
}) {
  const fieldID = useId()

  return (
    <Box style={providerSettingsFieldStyle}>
      <Label htmlFor={fieldID}>{label}</Label>
      <Input
        id={fieldID}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        style={{ width: '100%' }}
        type={type}
        value={value}
      />
      {hint ? <Text style={providerSettingsStatusMessageStyle}>{hint}</Text> : null}
    </Box>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  disabled?: boolean
}) {
  const fieldID = useId()

  return (
    <Box style={providerSettingsFieldStyle}>
      <Label htmlFor={fieldID}>{label}</Label>
      <TextArea
        disabled={disabled}
        id={fieldID}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        style={{ minHeight: '8rem' }}
        value={value}
      />
      {hint ? <Text style={providerSettingsStatusMessageStyle}>{hint}</Text> : null}
    </Box>
  )
}

function ModelSelectField({
  label,
  value,
  models,
  onChange,
  onRefresh,
  isRefreshing,
  hint,
  errorMessage,
}: {
  label: string
  value: string
  models: string[]
  onChange: (value: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  hint?: string
  errorMessage?: string | null
}) {
  const fieldID = useId()
  const options = Array.from(new Set([value.trim(), ...models.map((model) => model.trim())].filter(Boolean)))

  return (
    <Box style={providerSettingsFieldStyle}>
      <Label htmlFor={fieldID}>{label}</Label>
      <Box
        style={{
          display: 'flex',
          gap: 'var(--gap-xs)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Select
          id={fieldID}
          onChange={(event) => onChange(event.currentTarget.value)}
          style={{ flex: 1, minWidth: '14rem' }}
          value={value}
        >
          {options.length === 0 ? <option value="">No models loaded</option> : null}
          {options.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </Select>
        <Button disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? 'Loading…' : 'Refresh'}
        </Button>
      </Box>
      {errorMessage ? <Text style={providerSettingsErrorMessageStyle}>{errorMessage}</Text> : null}
      {!errorMessage && hint ? <Text style={providerSettingsStatusMessageStyle}>{hint}</Text> : null}
    </Box>
  )
}

function updateDraftField(
  setDraft: ReturnType<typeof useAgentProviderSettings>['setDraft'],
  updater: (draft: AgentProviderDraft) => AgentProviderDraft,
) {
  setDraft((currentDraft) => (currentDraft ? updater(currentDraft) : currentDraft))
}

function renderProxyKeySummary(draft: AgentProviderDraft['proxy']['channels'][number]) {
  if (draft.keyMode === 'replace') {
    return draft.apiKeysText.trim()
      ? 'One key per line. All entered keys will be enabled on save.'
      : 'Leave empty to clear the stored keys for this channel.'
  }

  if (draft.keyCount === 0) {
    return 'No stored keys are currently attached to this channel.'
  }

  return `Stored keys are preserved on save: ${draft.enabledKeyCount}/${draft.keyCount} enabled.`
}

function formatCodexAuthState(state?: string) {
  switch (state) {
    case 'ready':
      return 'Local auth ready'
    case 'invalid':
      return 'Local auth invalid'
    default:
      return 'Local auth missing'
  }
}

export function AgentProviderSettingsWidget() {
  const {
    availableModels,
    catalog,
    draft,
    errorMessage,
    isLoading,
    isLoadingModels,
    isSaving,
    modelErrorMessage,
    selectedProvider,
    selectedProviderID,
    setDraft,
    statusMessage,
    activateSelectedProvider,
    refreshAvailableModels,
    removeSelectedProvider,
    resetDraft,
    saveDraft,
    selectProvider,
    startCreateProvider,
  } = useAgentProviderSettings()

  const supportedKinds = (catalog?.supported_kinds ?? defaultSupportedKinds).filter(
    (kind) => kind !== 'proxy',
  )

  const updateProxyChannel = useCallback(
    (
      channelUID: string,
      updater: (
        channel: AgentProviderDraft['proxy']['channels'][number],
      ) => AgentProviderDraft['proxy']['channels'][number],
    ) => {
      updateDraftField(setDraft, (currentDraft) => {
        if (currentDraft.kind !== 'proxy') {
          return currentDraft
        }

        return {
          ...currentDraft,
          proxy: {
            ...currentDraft.proxy,
            channels: currentDraft.proxy.channels.map((channel) =>
              channel.uid === channelUID ? updater(channel) : channel,
            ),
          },
        }
      })
    },
    [setDraft],
  )

  return (
    <RunaDomScopeProvider component="agent-provider-settings-widget">
      <Box runaComponent="agent-provider-settings-root" style={providerSettingsRootStyle}>
        <Box runaComponent="agent-provider-settings-toolbar" style={providerSettingsToolbarStyle}>
          <Box runaComponent="agent-provider-settings-toolbar-meta" style={providerSettingsToolbarMetaStyle}>
            <Text style={{ fontWeight: 600 }}>AI provider routing</Text>
            <Text style={providerSettingsStatusMessageStyle}>
              Manage direct providers for local Codex auth, OpenAI-compatible endpoints, and Ollama without
              leaving the shell modal. The unfinished AI Proxy path is hidden from new setup until the
              CLI-backed routing slice replaces it.
            </Text>
          </Box>
          <Box
            runaComponent="agent-provider-settings-toolbar-actions"
            style={providerSettingsToolbarActionsStyle}
          >
            {supportedKinds.map((kind) => (
              <Button key={kind} onClick={() => startCreateProvider(kind)}>
                Add {kindLabels[kind]}
              </Button>
            ))}
          </Box>
        </Box>

        <Box runaComponent="agent-provider-settings-body" style={providerSettingsBodyStyle}>
          <Surface runaComponent="agent-provider-settings-sidebar" style={providerSettingsSidebarStyle}>
            <Text style={{ fontWeight: 600 }}>Configured providers</Text>
            <ScrollArea runaComponent="agent-provider-settings-list" style={providerSettingsListStyle}>
              {catalog?.providers.map((provider) => {
                const isSelected = provider.id === selectedProviderID

                return (
                  <Button
                    aria-pressed={isSelected}
                    key={provider.id}
                    onClick={() => selectProvider(provider.id)}
                    runaComponent="agent-provider-settings-provider-card"
                    style={{
                      ...providerSettingsListCardStyle,
                      borderColor: isSelected
                        ? 'var(--color-accent-emerald-strong)'
                        : provider.active
                          ? 'var(--color-border-strong)'
                          : 'var(--color-border-subtle)',
                      background: isSelected
                        ? 'var(--color-surface-glass-strong)'
                        : 'var(--color-surface-glass-soft)',
                    }}
                  >
                    <Box style={providerSettingsListCardMetaStyle}>
                      <Text style={{ fontWeight: 600 }}>
                        {provider.display_name || kindLabels[provider.kind]}
                      </Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.active ? 'Active' : provider.enabled ? 'Ready' : 'Disabled'}
                      </Text>
                    </Box>
                    <Text style={providerSettingsStatusMessageStyle}>{kindLabels[provider.kind]}</Text>
                    {provider.kind === 'proxy' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.proxy?.channels.length ?? 0} channel(s) · model {provider.proxy?.model}
                      </Text>
                    ) : provider.kind === 'codex' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.codex?.model} · {formatCodexAuthState(provider.codex?.auth_state)}
                      </Text>
                    ) : provider.kind === 'openai' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.openai?.model} ·{' '}
                        {provider.openai?.has_api_key ? 'key stored' : 'key missing'}
                      </Text>
                    ) : (
                      <Text style={providerSettingsStatusMessageStyle}>{provider.ollama?.base_url}</Text>
                    )}
                  </Button>
                )
              })}
              {!catalog?.providers.length ? (
                <Text style={providerSettingsStatusMessageStyle}>
                  No providers are available yet. Create one from the toolbar above.
                </Text>
              ) : null}
            </ScrollArea>
          </Surface>

          <Surface runaComponent="agent-provider-settings-editor" style={providerSettingsEditorStyle}>
            {!draft ? (
              <Box style={providerSettingsSectionHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>No provider selected</Text>
                <Text
                  style={
                    errorMessage ? providerSettingsErrorMessageStyle : providerSettingsStatusMessageStyle
                  }
                >
                  {errorMessage ?? 'Choose an existing provider on the left or create a new one.'}
                </Text>
              </Box>
            ) : (
              <>
                <ScrollArea
                  runaComponent="agent-provider-settings-editor-scroll"
                  style={providerSettingsEditorScrollStyle}
                >
                  <Box style={providerSettingsSectionStyle}>
                    <Box style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>
                        {draft.mode === 'new' ? 'New provider' : draft.displayName || kindLabels[draft.kind]}
                      </Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        Kind: {kindLabels[draft.kind]}
                        {selectedProvider?.active ? ' · currently active' : ''}
                      </Text>
                    </Box>
                    <Box style={providerSettingsGridStyle}>
                      <TextInputField
                        label="Display name"
                        onChange={(value) =>
                          updateDraftField(setDraft, (currentDraft) => ({
                            ...currentDraft,
                            displayName: value,
                          }))
                        }
                        placeholder="Provider display name"
                        value={draft.displayName}
                      />
                      <Box style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-enabled-toggle">Provider status</Label>
                        <Box style={providerSettingsInlineCheckboxStyle}>
                          <Checkbox
                            checked={draft.enabled}
                            id="provider-enabled-toggle"
                            onChange={(event) =>
                              updateDraftField(setDraft, (currentDraft) => ({
                                ...currentDraft,
                                enabled: event.currentTarget.checked,
                              }))
                            }
                          />
                          <Text>Enabled</Text>
                        </Box>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Disabled providers stay in the catalog but cannot become active.
                        </Text>
                      </Box>
                    </Box>
                  </Box>

                  {draft.kind === 'ollama' ? (
                    <Box style={providerSettingsSectionStyle}>
                      <Box style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>Ollama</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Direct local Ollama runtime with backend-discovered installed models.
                        </Text>
                      </Box>
                      <Box style={providerSettingsGridStyle}>
                        <TextInputField
                          label="Base URL"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              ollama: {
                                ...currentDraft.ollama,
                                baseURL: value,
                              },
                            }))
                          }
                          placeholder="http://127.0.0.1:11434"
                          value={draft.ollama.baseURL}
                        />
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="Installed models are loaded automatically from the configured Ollama host."
                          isRefreshing={isLoadingModels}
                          label="Model"
                          models={availableModels}
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              ollama: {
                                ...currentDraft.ollama,
                                model: value,
                              },
                            }))
                          }
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.ollama.model}
                        />
                      </Box>
                    </Box>
                  ) : null}

                  {draft.kind === 'codex' ? (
                    <Box style={providerSettingsSectionStyle}>
                      <Box style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>Codex</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Uses the local `codex` login on this machine and routes requests through the Codex
                          Responses backend instead of asking for an API key here.
                        </Text>
                      </Box>
                      <Box style={providerSettingsGridStyle}>
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="The model catalog is auto-loaded from the local Codex auth-backed upstream."
                          label="Model"
                          models={availableModels}
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              codex: {
                                ...currentDraft.codex,
                                model: value,
                              },
                            }))
                          }
                          isRefreshing={isLoadingModels}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.codex.model}
                        />
                        <TextInputField
                          hint="Leave empty to use ~/.codex/auth.json."
                          label="Auth file path"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              codex: {
                                ...currentDraft.codex,
                                authFilePath: value,
                              },
                            }))
                          }
                          placeholder="~/.codex/auth.json"
                          value={draft.codex.authFilePath}
                        />
                      </Box>
                      <Box style={providerSettingsGridStyle}>
                        <Box style={providerSettingsFieldStyle}>
                          <Label>Status</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.codex?.status_message ??
                              'Save the provider to let the backend inspect the local Codex auth state.'}
                          </Text>
                        </Box>
                        <Box style={providerSettingsFieldStyle}>
                          <Label>Detected auth mode</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.codex?.auth_mode || 'Unknown until saved'}
                          </Text>
                        </Box>
                      </Box>
                    </Box>
                  ) : null}

                  {draft.kind === 'openai' ? (
                    <Box style={providerSettingsSectionStyle}>
                      <Box style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>OpenAI-compatible upstream</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Use this for direct API-key-based OpenAI-compatible endpoints without Codex local
                          auth.
                        </Text>
                      </Box>
                      <Box style={providerSettingsGridStyle}>
                        <TextInputField
                          label="Base URL"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              openai: {
                                ...currentDraft.openai,
                                baseURL: value,
                              },
                            }))
                          }
                          placeholder="https://api.openai.com/v1"
                          value={draft.openai.baseURL}
                        />
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="The model catalog is auto-loaded after base URL or API key changes."
                          label="Model"
                          models={availableModels}
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              openai: {
                                ...currentDraft.openai,
                                model: value,
                              },
                            }))
                          }
                          isRefreshing={isLoadingModels}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.openai.model}
                        />
                        <Box style={providerSettingsFieldStyle}>
                          <Label htmlFor="openai-secret-mode">Stored key handling</Label>
                          <Select
                            id="openai-secret-mode"
                            onChange={(event) =>
                              updateDraftField(setDraft, (currentDraft) => ({
                                ...currentDraft,
                                openai: {
                                  ...currentDraft.openai,
                                  secretMode: event.currentTarget
                                    .value as AgentProviderDraft['openai']['secretMode'],
                                },
                              }))
                            }
                            value={draft.openai.secretMode}
                          >
                            <option value="preserve">Preserve stored key</option>
                            <option value="replace">Replace stored key</option>
                          </Select>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {draft.openai.hasStoredAPIKey
                              ? 'A key is already stored for this provider.'
                              : 'No key is currently stored for this provider.'}
                          </Text>
                        </Box>
                        <TextInputField
                          hint={
                            draft.openai.secretMode === 'replace'
                              ? 'A non-empty key is required when replacing.'
                              : 'Leave untouched to keep the stored secret.'
                          }
                          label="API key"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              openai: {
                                ...currentDraft.openai,
                                apiKey: value,
                              },
                            }))
                          }
                          placeholder={
                            draft.openai.secretMode === 'replace' ? 'sk-...' : 'stored secret preserved'
                          }
                          type="password"
                          value={draft.openai.apiKey}
                        />
                      </Box>
                    </Box>
                  ) : null}

                  {draft.kind === 'proxy' ? (
                    <Box style={providerSettingsSectionStyle}>
                      <Box style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>Internal proxy router</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Existing proxy records stay editable for migration, but new proxy setup is hidden
                          from the toolbar until the CLI-backed routing path replaces this draft surface.
                        </Text>
                      </Box>
                      <Box style={providerSettingsGridStyle}>
                        <TextInputField
                          label="Proxy model"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              proxy: {
                                ...currentDraft.proxy,
                                model: value,
                              },
                            }))
                          }
                          placeholder="assistant-default"
                          value={draft.proxy.model}
                        />
                      </Box>
                      <Box style={providerSettingsActionsGroupStyle}>
                        <Button
                          onClick={() =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              proxy: {
                                ...currentDraft.proxy,
                                channels: [...currentDraft.proxy.channels, createEmptyProxyChannelDraft()],
                              },
                            }))
                          }
                        >
                          Add channel
                        </Button>
                      </Box>
                      {draft.proxy.channels.map((channelDraft, index) => (
                        <Surface key={channelDraft.uid} style={providerSettingsChannelCardStyle}>
                          <Box style={providerSettingsChannelHeaderStyle}>
                            <Box style={providerSettingsChannelMetaStyle}>
                              <Text style={{ fontWeight: 600 }}>Channel {index + 1}</Text>
                              <Text style={providerSettingsStatusMessageStyle}>
                                {channelDraft.name || 'Unnamed channel'} · {channelDraft.serviceType}
                              </Text>
                            </Box>
                            <Box style={providerSettingsChannelActionsStyle}>
                              <Button
                                disabled={draft.proxy.channels.length <= 1}
                                onClick={() =>
                                  updateDraftField(setDraft, (currentDraft) => ({
                                    ...currentDraft,
                                    proxy: {
                                      ...currentDraft.proxy,
                                      channels: currentDraft.proxy.channels.filter(
                                        (candidate) => candidate.uid !== channelDraft.uid,
                                      ),
                                    },
                                  }))
                                }
                              >
                                Remove channel
                              </Button>
                            </Box>
                          </Box>
                          <Box style={providerSettingsGridStyle}>
                            <TextInputField
                              label="Channel name"
                              onChange={(value) =>
                                updateProxyChannel(channelDraft.uid, (channel) => ({
                                  ...channel,
                                  name: value,
                                }))
                              }
                              placeholder="Codex primary"
                              value={channelDraft.name}
                            />
                            <TextInputField
                              label="Stable channel id"
                              onChange={(value) =>
                                updateProxyChannel(channelDraft.uid, (channel) => ({
                                  ...channel,
                                  id: value,
                                }))
                              }
                              placeholder="codex-primary"
                              value={channelDraft.id}
                            />
                            <Box style={providerSettingsFieldStyle}>
                              <Label htmlFor={`proxy-service-${channelDraft.uid}`}>Service type</Label>
                              <Select
                                id={`proxy-service-${channelDraft.uid}`}
                                onChange={(event) =>
                                  updateProxyChannel(channelDraft.uid, (channel) => ({
                                    ...channel,
                                    serviceType: event.currentTarget
                                      .value as AgentProviderDraft['proxy']['channels'][number]['serviceType'],
                                  }))
                                }
                                value={channelDraft.serviceType}
                              >
                                <option value="openai">OpenAI-compatible</option>
                                <option value="claude">Claude-compatible</option>
                                <option value="gemini">Gemini</option>
                              </Select>
                            </Box>
                            <TextInputField
                              label="Base URL"
                              onChange={(value) =>
                                updateProxyChannel(channelDraft.uid, (channel) => ({
                                  ...channel,
                                  baseURL: value,
                                }))
                              }
                              placeholder="https://api.openai.com/v1"
                              value={channelDraft.baseURL}
                            />
                            <TextInputField
                              label="Priority"
                              onChange={(value) =>
                                updateProxyChannel(channelDraft.uid, (channel) => ({
                                  ...channel,
                                  priority: value,
                                }))
                              }
                              placeholder="10"
                              value={channelDraft.priority}
                            />
                            <Box style={providerSettingsFieldStyle}>
                              <Label htmlFor={`proxy-auth-${channelDraft.uid}`}>Auth type</Label>
                              <Select
                                id={`proxy-auth-${channelDraft.uid}`}
                                onChange={(event) =>
                                  updateProxyChannel(channelDraft.uid, (channel) => ({
                                    ...channel,
                                    authType: event.currentTarget
                                      .value as AgentProviderDraft['proxy']['channels'][number]['authType'],
                                  }))
                                }
                                value={channelDraft.authType}
                              >
                                <option value="">Auto</option>
                                <option value="bearer">Bearer</option>
                                <option value="x-api-key">x-api-key</option>
                                <option value="both">Both</option>
                                <option value="x-goog-api-key">x-goog-api-key</option>
                              </Select>
                            </Box>
                            <Box style={providerSettingsFieldStyle}>
                              <Label htmlFor={`proxy-status-${channelDraft.uid}`}>Status</Label>
                              <Select
                                id={`proxy-status-${channelDraft.uid}`}
                                onChange={(event) =>
                                  updateProxyChannel(channelDraft.uid, (channel) => ({
                                    ...channel,
                                    status: event.currentTarget
                                      .value as AgentProviderDraft['proxy']['channels'][number]['status'],
                                  }))
                                }
                                value={channelDraft.status}
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="disabled">Disabled</option>
                              </Select>
                            </Box>
                            <Box style={providerSettingsFieldStyle}>
                              <Label htmlFor={`proxy-tls-${channelDraft.uid}`}>TLS checks</Label>
                              <Box style={providerSettingsInlineCheckboxStyle}>
                                <Checkbox
                                  checked={channelDraft.insecureSkipVerify}
                                  id={`proxy-tls-${channelDraft.uid}`}
                                  onChange={(event) =>
                                    updateProxyChannel(channelDraft.uid, (channel) => ({
                                      ...channel,
                                      insecureSkipVerify: event.currentTarget.checked,
                                    }))
                                  }
                                />
                                <Text>Skip TLS verification</Text>
                              </Box>
                            </Box>
                          </Box>
                          <TextAreaField
                            hint="Optional failover URLs, one per line."
                            label="Fallback base URLs"
                            onChange={(value) =>
                              updateProxyChannel(channelDraft.uid, (channel) => ({
                                ...channel,
                                fallbackBaseURLsText: value,
                              }))
                            }
                            placeholder="https://example-backup/v1"
                            value={channelDraft.fallbackBaseURLsText}
                          />
                          <TextAreaField
                            hint='Write mapping lines as "model=upstream-model" or "model => upstream-model".'
                            label="Model mapping"
                            onChange={(value) =>
                              updateProxyChannel(channelDraft.uid, (channel) => ({
                                ...channel,
                                modelMappingText: value,
                              }))
                            }
                            placeholder="gpt-5-mini=codex-mini"
                            value={channelDraft.modelMappingText}
                          />
                          <TextAreaField
                            label="Description"
                            onChange={(value) =>
                              updateProxyChannel(channelDraft.uid, (channel) => ({
                                ...channel,
                                description: value,
                              }))
                            }
                            placeholder="Primary route for Codex traffic"
                            value={channelDraft.description}
                          />
                          <Box style={providerSettingsGridStyle}>
                            <Box style={providerSettingsFieldStyle}>
                              <Label htmlFor={`proxy-key-mode-${channelDraft.uid}`}>
                                Stored key handling
                              </Label>
                              <Select
                                id={`proxy-key-mode-${channelDraft.uid}`}
                                onChange={(event) =>
                                  updateProxyChannel(channelDraft.uid, (channel) => ({
                                    ...channel,
                                    keyMode: event.currentTarget
                                      .value as AgentProviderDraft['proxy']['channels'][number]['keyMode'],
                                  }))
                                }
                                value={channelDraft.keyMode}
                              >
                                <option value="preserve">Preserve stored keys</option>
                                <option value="replace">Replace stored keys</option>
                              </Select>
                              <Text style={providerSettingsStatusMessageStyle}>
                                {renderProxyKeySummary(channelDraft)}
                              </Text>
                            </Box>
                            <TextAreaField
                              disabled={channelDraft.keyMode === 'preserve'}
                              label="API keys"
                              onChange={(value) =>
                                updateProxyChannel(channelDraft.uid, (channel) => ({
                                  ...channel,
                                  apiKeysText: value,
                                }))
                              }
                              placeholder="sk-...\nsecond-key"
                              value={channelDraft.apiKeysText}
                            />
                          </Box>
                        </Surface>
                      ))}
                    </Box>
                  ) : null}
                </ScrollArea>

                <Box style={providerSettingsActionsBarStyle}>
                  <Box style={providerSettingsSectionHeaderStyle}>
                    {errorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>{errorMessage}</Text>
                    ) : null}
                    {!errorMessage && statusMessage ? (
                      <Text style={providerSettingsStatusMessageStyle}>{statusMessage}</Text>
                    ) : null}
                    {!errorMessage && !statusMessage && isLoading ? (
                      <Text style={providerSettingsStatusMessageStyle}>Loading provider catalog…</Text>
                    ) : null}
                  </Box>
                  <Box style={providerSettingsActionsGroupStyle}>
                    <Button disabled={isSaving} onClick={resetDraft}>
                      Reset
                    </Button>
                    {draft.mode === 'existing' ? (
                      <Button
                        disabled={isSaving || selectedProvider?.active}
                        onClick={() => void activateSelectedProvider()}
                      >
                        Activate
                      </Button>
                    ) : null}
                    {draft.mode === 'existing' ? (
                      <Button
                        disabled={isSaving || selectedProvider?.active}
                        onClick={() => void removeSelectedProvider()}
                      >
                        Delete
                      </Button>
                    ) : null}
                    <Button disabled={isSaving} onClick={() => void saveDraft()}>
                      {isSaving ? 'Saving…' : draft.mode === 'new' ? 'Create provider' : 'Save changes'}
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </Surface>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
