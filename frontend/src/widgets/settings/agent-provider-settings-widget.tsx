import { useId, useMemo, useState } from 'react'

import type {
  AgentProviderGatewayProvider,
  AgentProviderGatewayRun,
  AgentProviderKind,
} from '@/features/agent/api/provider-client'
import {
  formatProviderGatewayErrorCode,
  getProviderGatewayRecoveryAction,
} from '@/features/agent/model/provider-gateway-actions'
import type { AgentProviderDraft } from '@/features/agent/model/provider-settings-draft'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Button, Checkbox, Input, Label, ScrollArea, Select, Text } from '@/shared/ui/primitives'
import { ClearBox } from '@/shared/ui/components'
import {
  providerSettingsActionsBarStyle,
  providerSettingsActionsGroupStyle,
  providerSettingsBodyStyle,
  providerSettingsEditorScrollStyle,
  providerSettingsEditorStyle,
  providerSettingsEmbeddedBodyStyle,
  providerSettingsEmbeddedEditorStyle,
  providerSettingsEmbeddedSidebarStyle,
  providerSettingsEmbeddedToolbarStyle,
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
  codex: 'Codex CLI',
  claude: 'Claude Code CLI',
  'openai-compatible': 'OpenAI-Compatible HTTP',
}

const defaultSupportedKinds: AgentProviderKind[] = ['codex', 'claude', 'openai-compatible']

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
    <ClearBox style={providerSettingsFieldStyle}>
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
    </ClearBox>
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
    <ClearBox style={providerSettingsFieldStyle}>
      <Label htmlFor={fieldID}>{label}</Label>
      <ClearBox
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
      </ClearBox>
      {errorMessage ? <Text style={providerSettingsErrorMessageStyle}>{errorMessage}</Text> : null}
      {!errorMessage && hint ? <Text style={providerSettingsStatusMessageStyle}>{hint}</Text> : null}
    </ClearBox>
  )
}

function updateDraftField(
  setDraft: ReturnType<typeof useAgentProviderSettings>['setDraft'],
  updater: (draft: AgentProviderDraft) => AgentProviderDraft,
) {
  setDraft((currentDraft) => (currentDraft ? updater(currentDraft) : currentDraft))
}

function formatCLIStatus(state?: string) {
  switch (state) {
    case 'ready':
      return 'Route ready'
    case 'auth-required':
      return 'Login required'
    case 'disabled':
      return 'Disabled'
    case 'unchecked':
      return 'Unchecked'
    case 'unreachable':
      return 'Unreachable'
    case 'model-unavailable':
      return 'Model unavailable'
    default:
      return 'Needs attention'
  }
}

function formatGatewayStatus(status?: string) {
  switch (status) {
    case 'succeeded':
      return 'Healthy'
    case 'failed':
      return 'Failing'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'No runs yet'
  }
}

function formatDuration(durationMS?: number) {
  if (!durationMS || durationMS <= 0) {
    return 'n/a'
  }
  if (durationMS >= 1000) {
    return `${(durationMS / 1000).toFixed(durationMS >= 10_000 ? 0 : 1)}s`
  }
  return `${durationMS}ms`
}

function formatRunTimestamp(value?: string) {
  if (!value) {
    return 'n/a'
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'n/a'
  }
  return timestamp.toLocaleString()
}

function routeStatusForProvider(
  providerID: string | null | undefined,
  gateway?: AgentProviderGatewayProvider[] | null,
) {
  if (!providerID || !gateway?.length) {
    return null
  }
  return gateway.find((provider) => provider.provider_id === providerID) ?? null
}

function runMatchesHistoryQuery(run: AgentProviderGatewayRun, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }
  return [
    run.provider_display_name,
    run.provider_id,
    run.model,
    run.error_message,
    run.error_code,
    run.conversation_id,
    run.request_mode,
    run.status,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery))
}

export function AgentProviderSettingsWidget({ embedded = false }: { embedded?: boolean }) {
  const {
    availableModels,
    catalog,
    draft,
    errorMessage,
    gateway,
    gatewayErrorMessage,
    isLoading,
    isLoadingModels,
    isPreparing,
    isProbing,
    isSaving,
    modelErrorMessage,
    probeErrorMessage,
    selectedProvider,
    selectedProviderID,
    setDraft,
    statusMessage,
    activateSelectedProvider,
    prewarmSelectedProvider,
    probeSelectedProvider,
    refreshAvailableModels,
    removeSelectedProvider,
    resetDraft,
    saveDraft,
    selectProvider,
    startCreateProvider,
  } = useAgentProviderSettings()

  const supportedKinds = (catalog?.supported_kinds ?? defaultSupportedKinds).filter(
    (kind) => kind === 'codex' || kind === 'claude' || kind === 'openai-compatible',
  )
  const toolbarStyle = embedded ? providerSettingsEmbeddedToolbarStyle : providerSettingsToolbarStyle
  const bodyStyle = embedded ? providerSettingsEmbeddedBodyStyle : providerSettingsBodyStyle
  const sidebarStyle = embedded ? providerSettingsEmbeddedSidebarStyle : providerSettingsSidebarStyle
  const editorStyle = embedded ? providerSettingsEmbeddedEditorStyle : providerSettingsEditorStyle
  const selectedGatewayProvider = routeStatusForProvider(selectedProviderID, gateway?.providers ?? null)
  const selectedGatewayRecoveryAction = getProviderGatewayRecoveryAction(selectedGatewayProvider)
  const recentGatewayRuns = gateway?.recent_runs ?? []
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyStatus, setHistoryStatus] = useState<'all' | 'failed' | 'succeeded' | 'cancelled'>('all')
  const [historyScope, setHistoryScope] = useState<'selected' | 'all'>('selected')
  const filteredRecentGatewayRuns = useMemo(() => {
    return recentGatewayRuns.filter((run) => {
      if (historyScope === 'selected' && selectedProviderID && run.provider_id !== selectedProviderID) {
        return false
      }
      if (historyStatus !== 'all' && run.status !== historyStatus) {
        return false
      }
      return runMatchesHistoryQuery(run, historyQuery)
    })
  }, [historyQuery, historyScope, historyStatus, recentGatewayRuns, selectedProviderID])
  const [selectedHistoryRunID, setSelectedHistoryRunID] = useState('')
  const selectedHistoryRun =
    filteredRecentGatewayRuns.find((run) => run.id === selectedHistoryRunID) ??
    filteredRecentGatewayRuns[0] ??
    null

  return (
    <RunaDomScopeProvider component="agent-provider-settings-widget">
      <ClearBox runaComponent="agent-provider-settings-root" style={providerSettingsRootStyle}>
        <ClearBox runaComponent="agent-provider-settings-toolbar" style={toolbarStyle}>
          <ClearBox
            runaComponent="agent-provider-settings-toolbar-meta"
            style={providerSettingsToolbarMetaStyle}
          >
            <Text style={{ fontWeight: 600 }}>
              {embedded ? 'AI / Установленные приложения' : 'AI provider routing'}
            </Text>
            <Text style={providerSettingsStatusMessageStyle}>
              {embedded
                ? 'Подключай CLI providers для чата и управляй активным runtime без лишних переходов между settings sections.'
                : 'Manage local Codex CLI and Claude Code CLI routing without leaving the shell modal.'}
            </Text>
          </ClearBox>
          <ClearBox
            runaComponent="agent-provider-settings-toolbar-actions"
            style={providerSettingsToolbarActionsStyle}
          >
            {supportedKinds.map((kind) => (
              <Button key={kind} onClick={() => startCreateProvider(kind)}>
                Add {kindLabels[kind]}
              </Button>
            ))}
          </ClearBox>
        </ClearBox>

        <ClearBox runaComponent="agent-provider-settings-body" style={bodyStyle}>
          <ClearBox runaComponent="agent-provider-settings-sidebar" style={sidebarStyle}>
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
                    <ClearBox style={providerSettingsListCardMetaStyle}>
                      <Text style={{ fontWeight: 600 }}>
                        {provider.display_name || kindLabels[provider.kind]}
                      </Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.active ? 'Active' : provider.enabled ? 'Ready' : 'Disabled'}
                      </Text>
                    </ClearBox>
                    <Text style={providerSettingsStatusMessageStyle}>{kindLabels[provider.kind]}</Text>
                    {provider.kind === 'codex' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.codex?.model} ·{' '}
                        {formatCLIStatus(
                          routeStatusForProvider(provider.id, gateway?.providers ?? null)?.route_status_state,
                        )}
                      </Text>
                    ) : provider.kind === 'claude' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.claude?.model} ·{' '}
                        {formatCLIStatus(
                          routeStatusForProvider(provider.id, gateway?.providers ?? null)?.route_status_state,
                        )}
                      </Text>
                    ) : provider.kind === 'openai-compatible' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.openai_compatible?.model} ·{' '}
                        {routeStatusForProvider(provider.id, gateway?.providers ?? null)?.base_url ??
                          provider.openai_compatible?.base_url}
                      </Text>
                    ) : null}
                    {gateway?.providers.find((entry) => entry.provider_id === provider.id)?.total_runs ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {(() => {
                          const gatewayEntry = gateway.providers.find(
                            (entry) => entry.provider_id === provider.id,
                          )
                          if (!gatewayEntry) {
                            return ''
                          }
                          return `${formatGatewayStatus(gatewayEntry.last_status)} · ${gatewayEntry.succeeded_runs}/${gatewayEntry.total_runs} ok · avg ${formatDuration(gatewayEntry.average_duration_ms)}`
                        })()}
                      </Text>
                    ) : null}
                  </Button>
                )
              })}
              {!catalog?.providers.length ? (
                <Text style={providerSettingsStatusMessageStyle}>
                  No providers are available yet. Create one from the toolbar above.
                </Text>
              ) : null}
            </ScrollArea>
          </ClearBox>

          <ClearBox runaComponent="agent-provider-settings-editor" style={editorStyle}>
            {!draft ? (
              <ClearBox style={providerSettingsSectionHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>No provider selected</Text>
                <Text
                  style={
                    errorMessage ? providerSettingsErrorMessageStyle : providerSettingsStatusMessageStyle
                  }
                >
                  {errorMessage ?? 'Choose an existing provider on the left or create a new one.'}
                </Text>
              </ClearBox>
            ) : (
              <>
                <ScrollArea
                  runaComponent="agent-provider-settings-editor-scroll"
                  style={providerSettingsEditorScrollStyle}
                >
                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>
                        {draft.mode === 'new' ? 'New provider' : draft.displayName || kindLabels[draft.kind]}
                      </Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        Kind: {kindLabels[draft.kind]}
                        {selectedProvider?.active ? ' · currently active' : ''}
                      </Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
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
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-enabled-toggle">Provider status</Label>
                        <ClearBox style={providerSettingsInlineCheckboxStyle}>
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
                        </ClearBox>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Disabled providers stay in the catalog but cannot become active.
                        </Text>
                      </ClearBox>
                    </ClearBox>
                  </ClearBox>

                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>Gateway signals</Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        Backend-owned recent run history and health signals for the active provider route.
                      </Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>Current status</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatCLIStatus(selectedGatewayProvider?.route_status_state)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>Average latency</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.average_duration_ms)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>First response</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.last_first_response_latency_ms)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>Route checked</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatRunTimestamp(selectedGatewayProvider?.route_checked_at)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>Probe latency</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.route_latency_ms)}
                        </Text>
                      </ClearBox>
                    </ClearBox>
                    {gatewayErrorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>
                        Gateway telemetry is unavailable: {gatewayErrorMessage}
                      </Text>
                    ) : null}
                    {selectedGatewayProvider?.last_error_message ? (
                      <Text style={providerSettingsErrorMessageStyle}>
                        Last error
                        {formatProviderGatewayErrorCode(selectedGatewayProvider.last_error_code)
                          ? ` (${formatProviderGatewayErrorCode(selectedGatewayProvider.last_error_code)})`
                          : ''}
                        : {selectedGatewayProvider.last_error_message}
                      </Text>
                    ) : null}
                    {selectedGatewayProvider?.route_prepare_message ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {selectedGatewayProvider.route_prepare_message}
                      </Text>
                    ) : null}
                    {selectedGatewayProvider?.route_status_message ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {selectedGatewayProvider.route_status_message}
                      </Text>
                    ) : null}
                    <ClearBox style={providerSettingsActionsGroupStyle}>
                      <Button
                        disabled={isSaving || isProbing || draft.mode !== 'existing'}
                        onClick={() => void probeSelectedProvider()}
                      >
                        {isProbing ? 'Probing…' : 'Probe provider route'}
                      </Button>
                      {selectedGatewayRecoveryAction?.kind === 'prepare' ? (
                        <Button
                          disabled={isSaving || isPreparing || draft.mode !== 'existing'}
                          onClick={() => void prewarmSelectedProvider()}
                        >
                          {isPreparing ? 'Preparing…' : selectedGatewayRecoveryAction.label}
                        </Button>
                      ) : null}
                      {selectedGatewayRecoveryAction?.kind === 'probe' &&
                      selectedGatewayRecoveryAction.label !== 'Probe route' ? (
                        <Text style={providerSettingsStatusMessageStyle}>
                          Suggested recovery: {selectedGatewayRecoveryAction.label}
                        </Text>
                      ) : null}
                    </ClearBox>
                    {probeErrorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>{probeErrorMessage}</Text>
                    ) : null}
                  </ClearBox>

                  {draft.kind === 'codex' ? (
                    <ClearBox style={providerSettingsSectionStyle}>
                      <ClearBox style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>Codex CLI</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Uses local `codex exec` in non-interactive mode for chat completions.
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <TextInputField
                          hint="Command name or absolute path. Defaults to codex."
                          label="Command"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              codex: {
                                ...currentDraft.codex,
                                command: value,
                              },
                            }))
                          }
                          placeholder="codex"
                          value={draft.codex.command}
                        />
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="CLI model aliases are resolved by the local Codex CLI."
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
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Status</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.route_status_message ??
                              'Save the provider, then probe the route to inspect the backend-owned Codex status.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Resolved binary</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.resolved_binary || 'Unknown until probed'}
                          </Text>
                        </ClearBox>
                      </ClearBox>
                    </ClearBox>
                  ) : null}

                  {draft.kind === 'claude' ? (
                    <ClearBox style={providerSettingsSectionStyle}>
                      <ClearBox style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>Claude Code CLI</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Uses local `claude -p` in non-interactive mode with tools disabled for chat
                          completions.
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <TextInputField
                          hint="Command name or absolute path. Defaults to claude."
                          label="Command"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              claude: {
                                ...currentDraft.claude,
                                command: value,
                              },
                            }))
                          }
                          placeholder="claude"
                          value={draft.claude.command}
                        />
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="Common Claude Code aliases are exposed locally; the CLI resolves exact model support."
                          label="Model"
                          models={availableModels}
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              claude: {
                                ...currentDraft.claude,
                                model: value,
                              },
                            }))
                          }
                          isRefreshing={isLoadingModels}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.claude.model}
                        />
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Status</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.route_status_message ??
                              'Save the provider, then probe the route to inspect the backend-owned Claude status.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Resolved binary</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.resolved_binary || 'Unknown until probed'}
                          </Text>
                        </ClearBox>
                      </ClearBox>
                    </ClearBox>
                  ) : null}

                  {draft.kind === 'openai-compatible' ? (
                    <ClearBox style={providerSettingsSectionStyle}>
                      <ClearBox style={providerSettingsSectionHeaderStyle}>
                        <Text style={{ fontWeight: 600 }}>OpenAI-compatible HTTP</Text>
                        <Text style={providerSettingsStatusMessageStyle}>
                          Uses an OpenAI-compatible `/v1/models` and `/v1/chat/completions` endpoint.
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <TextInputField
                          hint="Base URL for the HTTP source. Example: http://192.168.1.8:8317"
                          label="Base URL"
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              openAICompatible: {
                                ...currentDraft.openAICompatible,
                                baseURL: value,
                              },
                            }))
                          }
                          placeholder="http://127.0.0.1:8317"
                          value={draft.openAICompatible.baseURL}
                        />
                        <ModelSelectField
                          errorMessage={modelErrorMessage}
                          hint="The backend reads `/v1/models` from this source and exposes enabled models in the chat toolbar."
                          label="Model"
                          models={availableModels}
                          onChange={(value) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              openAICompatible: {
                                ...currentDraft.openAICompatible,
                                model: value,
                              },
                            }))
                          }
                          isRefreshing={isLoadingModels}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.openAICompatible.model}
                        />
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Connection</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.base_url ??
                              selectedProvider?.openai_compatible?.base_url ??
                              'Save the provider to expose the source in the shared AI toolbar.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Chat visibility</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.openai_compatible?.chat_models?.length
                              ? `${selectedProvider.openai_compatible.chat_models.length} models enabled for the chat toolbar.`
                              : 'No discovered models are enabled yet.'}
                          </Text>
                        </ClearBox>
                      </ClearBox>
                    </ClearBox>
                  ) : null}

                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>Recent provider activity</Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        Latest backend-recorded chat runs across the current provider gateway.
                      </Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <TextInputField
                        hint="Filter by provider, model, request mode, error, or conversation id."
                        label="History search"
                        onChange={setHistoryQuery}
                        placeholder="Search recent runs"
                        value={historyQuery}
                      />
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-history-status-filter">Status filter</Label>
                        <Select
                          id="provider-history-status-filter"
                          onChange={(event) =>
                            setHistoryStatus(
                              event.currentTarget.value as 'all' | 'failed' | 'succeeded' | 'cancelled',
                            )
                          }
                          value={historyStatus}
                        >
                          <option value="all">All statuses</option>
                          <option value="failed">Failed only</option>
                          <option value="succeeded">Succeeded only</option>
                          <option value="cancelled">Cancelled only</option>
                        </Select>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-history-scope-filter">Provider scope</Label>
                        <Select
                          id="provider-history-scope-filter"
                          onChange={(event) =>
                            setHistoryScope(event.currentTarget.value as 'selected' | 'all')
                          }
                          value={historyScope}
                        >
                          <option value="selected">Selected provider</option>
                          <option value="all">All providers</option>
                        </Select>
                      </ClearBox>
                    </ClearBox>
                    <ClearBox style={{ display: 'grid', gap: 'var(--gap-xs)' }}>
                      {filteredRecentGatewayRuns.length ? (
                        filteredRecentGatewayRuns.map((run: AgentProviderGatewayRun) => (
                          <ClearBox
                            aria-pressed={selectedHistoryRun?.id === run.id}
                            key={run.id}
                            onClick={() => setSelectedHistoryRunID(run.id)}
                            style={{
                              border:
                                selectedHistoryRun?.id === run.id
                                  ? '1px solid var(--color-accent-emerald-strong)'
                                  : '1px solid var(--color-border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-sm)',
                              background:
                                selectedHistoryRun?.id === run.id
                                  ? 'var(--color-surface-glass-strong)'
                                  : 'var(--color-surface-glass-soft)',
                              display: 'grid',
                              gap: '0.2rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Text style={{ fontWeight: 600 }}>
                              {run.provider_display_name || run.provider_id} ·{' '}
                              {formatGatewayStatus(run.status)}
                            </Text>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {run.request_mode} · {run.model || 'default model'} ·{' '}
                              {formatDuration(run.duration_ms)} · first{' '}
                              {formatDuration(run.first_response_latency_ms)} ·{' '}
                              {formatRunTimestamp(run.completed_at)}
                            </Text>
                            {run.error_message ? (
                              <Text style={providerSettingsErrorMessageStyle}>{run.error_message}</Text>
                            ) : null}
                          </ClearBox>
                        ))
                      ) : (
                        <Text style={providerSettingsStatusMessageStyle}>
                          No provider activity matches the current filters.
                        </Text>
                      )}
                    </ClearBox>
                    {selectedHistoryRun ? (
                      <ClearBox
                        style={{
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-md)',
                          background: 'var(--color-surface-glass-soft)',
                          display: 'grid',
                          gap: 'var(--gap-sm)',
                        }}
                      >
                        <ClearBox style={providerSettingsSectionHeaderStyle}>
                          <Text style={{ fontWeight: 600 }}>Run diagnostics</Text>
                          <Text style={providerSettingsStatusMessageStyle}>
                            Detailed operator view for the selected persisted provider run.
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsGridStyle}>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Provider</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.provider_display_name || selectedHistoryRun.provider_id}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Status</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatGatewayStatus(selectedHistoryRun.status)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Error class</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatProviderGatewayErrorCode(selectedHistoryRun.error_code) || 'n/a'}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Conversation</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.conversation_id || 'n/a'}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Request mode</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.request_mode}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Model</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.model || 'default model'}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>First response</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatDuration(selectedHistoryRun.first_response_latency_ms)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Total duration</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatDuration(selectedHistoryRun.duration_ms)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Started</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatRunTimestamp(selectedHistoryRun.started_at)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>Completed</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatRunTimestamp(selectedHistoryRun.completed_at)}
                            </Text>
                          </ClearBox>
                        </ClearBox>
                        {selectedHistoryRun.error_message ? (
                          <Text style={providerSettingsErrorMessageStyle}>
                            {selectedHistoryRun.error_message}
                          </Text>
                        ) : null}
                      </ClearBox>
                    ) : null}
                  </ClearBox>
                </ScrollArea>

                <ClearBox style={providerSettingsActionsBarStyle}>
                  <ClearBox style={providerSettingsSectionHeaderStyle}>
                    {errorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>{errorMessage}</Text>
                    ) : null}
                    {!errorMessage && statusMessage ? (
                      <Text style={providerSettingsStatusMessageStyle}>{statusMessage}</Text>
                    ) : null}
                    {!errorMessage && !statusMessage && isLoading ? (
                      <Text style={providerSettingsStatusMessageStyle}>Loading provider catalog…</Text>
                    ) : null}
                  </ClearBox>
                  <ClearBox style={providerSettingsActionsGroupStyle}>
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
                  </ClearBox>
                </ClearBox>
              </>
            )}
          </ClearBox>
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
