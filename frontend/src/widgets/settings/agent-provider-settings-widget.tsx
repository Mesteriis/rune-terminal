import { useId, useState } from 'react'

import type { AppLocale } from '@/shared/api/runtime'
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
import {
  agentProviderSettingsWidgetCopy,
  type AgentProviderSettingsWidgetCopy,
} from '@/widgets/settings/agent-provider-settings-widget-copy'

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
  copy,
}: {
  label: string
  value: string
  models: string[]
  onChange: (value: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  hint?: string
  errorMessage?: string | null
  copy: AgentProviderSettingsWidgetCopy
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
          {options.length === 0 ? <option value="">{copy.noModelsLoaded}</option> : null}
          {options.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </Select>
        <Button disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? copy.loadingModels : copy.refresh}
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

function formatCLIStatus(state: string | undefined, copy: AgentProviderSettingsWidgetCopy) {
  switch (state) {
    case 'ready':
      return copy.statuses.routeReady
    case 'auth-required':
      return copy.statuses.loginRequired
    case 'disabled':
      return copy.statuses.disabled
    case 'unchecked':
      return copy.statuses.unchecked
    case 'unreachable':
      return copy.statuses.unreachable
    case 'model-unavailable':
      return copy.statuses.modelUnavailable
    default:
      return copy.statuses.needsAttention
  }
}

function formatGatewayStatus(status: string | undefined, copy: AgentProviderSettingsWidgetCopy) {
  switch (status) {
    case 'succeeded':
      return copy.statuses.healthy
    case 'failed':
      return copy.statuses.failing
    case 'cancelled':
      return copy.statuses.cancelled
    default:
      return copy.statuses.noRuns
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

function formatRunTimestamp(value: string | undefined, copy: AgentProviderSettingsWidgetCopy) {
  if (!value) {
    return copy.unknown
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return copy.unknown
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

export function AgentProviderSettingsWidget({
  embedded = false,
  locale = 'en',
}: {
  embedded?: boolean
  locale?: AppLocale
}) {
  const copy = agentProviderSettingsWidgetCopy[locale]
  const {
    availableModels,
    catalog,
    draft,
    errorMessage,
    gateway,
    gatewayErrorMessage,
    historyHasMore,
    historyErrorMessage,
    historyLimit,
    historyOffset,
    historyQuery,
    historyRuns,
    historyScope,
    historyStatus,
    historyTotal,
    isHistoryLoading,
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
    setHistoryLimit,
    setHistoryQuery,
    setHistoryScope,
    setHistoryStatus,
    statusMessage,
    activateSelectedProvider,
    clearSelectedProviderRouteState,
    loadMoreHistory,
    providerGatewayHistoryPageOptions,
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
  const [selectedHistoryRunID, setSelectedHistoryRunID] = useState('')
  const selectedHistoryRun =
    historyRuns.find((run) => run.id === selectedHistoryRunID) ?? historyRuns[0] ?? null

  return (
    <RunaDomScopeProvider component="agent-provider-settings-widget">
      <ClearBox runaComponent="agent-provider-settings-root" style={providerSettingsRootStyle}>
        <ClearBox runaComponent="agent-provider-settings-toolbar" style={toolbarStyle}>
          <ClearBox
            runaComponent="agent-provider-settings-toolbar-meta"
            style={providerSettingsToolbarMetaStyle}
          >
            <Text style={{ fontWeight: 600 }}>{embedded ? copy.titleEmbedded : copy.title}</Text>
            <Text style={providerSettingsStatusMessageStyle}>
              {embedded ? copy.descriptionEmbedded : copy.description}
            </Text>
          </ClearBox>
          <ClearBox
            runaComponent="agent-provider-settings-toolbar-actions"
            style={providerSettingsToolbarActionsStyle}
          >
            {supportedKinds.map((kind) => (
              <Button key={kind} onClick={() => startCreateProvider(kind)}>
                {copy.addProvider(kindLabels[kind])}
              </Button>
            ))}
          </ClearBox>
        </ClearBox>

        <ClearBox runaComponent="agent-provider-settings-body" style={bodyStyle}>
          <ClearBox runaComponent="agent-provider-settings-sidebar" style={sidebarStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.configuredProviders}</Text>
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
                        {provider.active ? copy.active : provider.enabled ? copy.ready : copy.disabled}
                      </Text>
                    </ClearBox>
                    <Text style={providerSettingsStatusMessageStyle}>{kindLabels[provider.kind]}</Text>
                    {provider.kind === 'codex' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.codex?.model} ·{' '}
                        {formatCLIStatus(
                          routeStatusForProvider(provider.id, gateway?.providers ?? null)?.route_status_state,
                          copy,
                        )}
                      </Text>
                    ) : provider.kind === 'claude' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.claude?.model} ·{' '}
                        {formatCLIStatus(
                          routeStatusForProvider(provider.id, gateway?.providers ?? null)?.route_status_state,
                          copy,
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
                          return `${formatGatewayStatus(gatewayEntry.last_status, copy)} · ${copy.routeStats(
                            gatewayEntry.succeeded_runs,
                            gatewayEntry.total_runs,
                            formatDuration(gatewayEntry.average_duration_ms),
                          )}`
                        })()}
                      </Text>
                    ) : null}
                  </Button>
                )
              })}
              {!catalog?.providers.length ? (
                <Text style={providerSettingsStatusMessageStyle}>{copy.noProviders}</Text>
              ) : null}
            </ScrollArea>
          </ClearBox>

          <ClearBox runaComponent="agent-provider-settings-editor" style={editorStyle}>
            {!draft ? (
              <ClearBox style={providerSettingsSectionHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>{copy.noProviderSelected}</Text>
                <Text
                  style={
                    errorMessage ? providerSettingsErrorMessageStyle : providerSettingsStatusMessageStyle
                  }
                >
                  {errorMessage ?? copy.chooseProvider}
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
                        {draft.mode === 'new'
                          ? copy.createProvider
                          : draft.displayName || kindLabels[draft.kind]}
                      </Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        {copy.kind(kindLabels[draft.kind], Boolean(selectedProvider?.active))}
                      </Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <TextInputField
                        label={copy.displayName}
                        onChange={(value) =>
                          updateDraftField(setDraft, (currentDraft) => ({
                            ...currentDraft,
                            displayName: value,
                          }))
                        }
                        placeholder={copy.displayNamePlaceholder}
                        value={draft.displayName}
                      />
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-enabled-toggle">{copy.providerStatus}</Label>
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
                          <Text>{copy.ready}</Text>
                        </ClearBox>
                        <Text style={providerSettingsStatusMessageStyle}>{copy.disabledProviderHint}</Text>
                      </ClearBox>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <TextInputField
                        hint={copy.ownerHint}
                        label={copy.ownerUsername}
                        onChange={(value) =>
                          updateDraftField(setDraft, (currentDraft) => ({
                            ...currentDraft,
                            ownerUsername: value,
                          }))
                        }
                        placeholder={catalog?.current_actor.username || 'owner'}
                        value={draft.ownerUsername}
                      />
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-visibility-select">{copy.providerVisibility}</Label>
                        <Select
                          id="provider-visibility-select"
                          onChange={(event) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              visibility: event.currentTarget.value,
                            }))
                          }
                          value={draft.visibility}
                        >
                          <option value="private">{copy.private}</option>
                          <option value="shared">{copy.shared}</option>
                        </Select>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {copy.currentActor(catalog?.current_actor.username || copy.unknown)}
                        </Text>
                      </ClearBox>
                      <TextInputField
                        hint={copy.allowedUsersHint}
                        label={copy.allowedUsers}
                        onChange={(value) =>
                          updateDraftField(setDraft, (currentDraft) => ({
                            ...currentDraft,
                            allowedUsers: value,
                          }))
                        }
                        placeholder="alice, bob"
                        value={draft.allowedUsers}
                      />
                    </ClearBox>
                    {selectedProvider ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {copy.createdUpdated(
                          selectedProvider.created_by.username || copy.unknown,
                          selectedProvider.updated_by.username || copy.unknown,
                        )}
                      </Text>
                    ) : null}
                  </ClearBox>

                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>{copy.gatewaySignals}</Text>
                      <Text style={providerSettingsStatusMessageStyle}>{copy.gatewaySignalsDescription}</Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.currentStatus}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatCLIStatus(selectedGatewayProvider?.route_status_state, copy)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.averageLatency}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.average_duration_ms)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.firstResponse}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.last_first_response_latency_ms)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.routeChecked}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatRunTimestamp(selectedGatewayProvider?.route_checked_at, copy)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.probeLatency}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {formatDuration(selectedGatewayProvider?.route_latency_ms)}
                        </Text>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label>{copy.warmPolicy}</Label>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {selectedGatewayProvider?.route_prewarm_policy || draft.prewarmPolicy} · {copy.ttl}{' '}
                          {selectedGatewayProvider?.route_warm_ttl_seconds || draft.warmTTLSeconds}s
                        </Text>
                      </ClearBox>
                    </ClearBox>
                    {gatewayErrorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>
                        {copy.gatewayTelemetryUnavailable(gatewayErrorMessage)}
                      </Text>
                    ) : null}
                    {selectedGatewayProvider?.last_error_message ? (
                      <Text style={providerSettingsErrorMessageStyle}>
                        {copy.lastError}
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
                    {selectedGatewayProvider?.route_prepare_expires_at ? (
                      <Text
                        style={
                          selectedGatewayProvider.route_prepare_stale
                            ? providerSettingsErrorMessageStyle
                            : providerSettingsStatusMessageStyle
                        }
                      >
                        {copy.warmWindowEnds(
                          formatRunTimestamp(selectedGatewayProvider.route_prepare_expires_at, copy),
                        )}
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
                        {isProbing ? copy.probing : copy.probeProviderRoute}
                      </Button>
                      {selectedGatewayRecoveryAction?.kind === 'prepare' ? (
                        <Button
                          disabled={isSaving || isPreparing || draft.mode !== 'existing'}
                          onClick={() => void prewarmSelectedProvider()}
                        >
                          {isPreparing ? copy.preparing : selectedGatewayRecoveryAction.label}
                        </Button>
                      ) : null}
                      <Button
                        disabled={isSaving || isPreparing || draft.mode !== 'existing'}
                        onClick={() => void clearSelectedProviderRouteState()}
                      >
                        {copy.clearRouteState}
                      </Button>
                      {selectedGatewayRecoveryAction?.kind === 'probe' &&
                      selectedGatewayRecoveryAction.label !== 'Probe route' ? (
                        <Text style={providerSettingsStatusMessageStyle}>
                          {copy.suggestedRecovery(selectedGatewayRecoveryAction.label)}
                        </Text>
                      ) : null}
                    </ClearBox>
                    {probeErrorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>{probeErrorMessage}</Text>
                    ) : null}
                  </ClearBox>

                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>{copy.routePolicy}</Text>
                      <Text style={providerSettingsStatusMessageStyle}>{copy.prewarmSectionDescription}</Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-prewarm-policy">{copy.prewarmPolicy}</Label>
                        <Select
                          id="provider-prewarm-policy"
                          onChange={(event) =>
                            updateDraftField(setDraft, (currentDraft) => ({
                              ...currentDraft,
                              prewarmPolicy: event.currentTarget.value as
                                | 'manual'
                                | 'on_activate'
                                | 'on_startup',
                            }))
                          }
                          value={draft.prewarmPolicy}
                        >
                          <option value="manual">{copy.manualOnly}</option>
                          <option value="on_activate">{copy.prepareOnActivate}</option>
                          <option value="on_startup">{copy.prepareOnAppStart}</option>
                        </Select>
                      </ClearBox>
                      <TextInputField
                        hint={copy.warmTtlHint}
                        label={copy.warmTtl}
                        onChange={(value) =>
                          updateDraftField(setDraft, (currentDraft) => ({
                            ...currentDraft,
                            warmTTLSeconds: Math.max(0, Number.parseInt(value || '0', 10) || 0),
                          }))
                        }
                        type="number"
                        value={String(draft.warmTTLSeconds)}
                      />
                    </ClearBox>
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
                          hint={copy.commandHint('codex')}
                          label={copy.command}
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
                          hint={copy.modelCodexHint}
                          label={copy.model}
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
                          copy={copy}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.codex.model}
                        />
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.status}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.route_status_message ?? copy.probeProviderRoute}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.resolvedBinary}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.resolved_binary || copy.unknownUntilProbed}
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
                          hint={copy.commandHint('claude')}
                          label={copy.command}
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
                          hint={copy.modelClaudeHint}
                          label={copy.model}
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
                          copy={copy}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.claude.model}
                        />
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.status}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.route_status_message ?? copy.probeProviderRoute}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.resolvedBinary}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.resolved_binary || copy.unknownUntilProbed}
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
                          label={copy.baseUrl}
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
                          hint={copy.modelHttpHint}
                          label={copy.model}
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
                          copy={copy}
                          onRefresh={() => void refreshAvailableModels()}
                          value={draft.openAICompatible.model}
                        />
                      </ClearBox>
                      <ClearBox style={providerSettingsGridStyle}>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.connection}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedGatewayProvider?.base_url ??
                              selectedProvider?.openai_compatible?.base_url ??
                              copy.probeProviderRoute}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>{copy.chatVisibility}</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.openai_compatible?.chat_models?.length
                              ? copy.chatEnabledModels(selectedProvider.openai_compatible.chat_models.length)
                              : copy.noDiscoveredModelsEnabled}
                          </Text>
                        </ClearBox>
                      </ClearBox>
                    </ClearBox>
                  ) : null}

                  <ClearBox style={providerSettingsSectionStyle}>
                    <ClearBox style={providerSettingsSectionHeaderStyle}>
                      <Text style={{ fontWeight: 600 }}>{copy.recentProviderActivity}</Text>
                      <Text style={providerSettingsStatusMessageStyle}>
                        {copy.recentProviderActivityDescription}
                      </Text>
                    </ClearBox>
                    <ClearBox style={providerSettingsGridStyle}>
                      <TextInputField
                        hint={copy.historySearchHint}
                        label={copy.historySearch}
                        onChange={setHistoryQuery}
                        placeholder={copy.historySearchPlaceholder}
                        value={historyQuery}
                      />
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-history-status-filter">{copy.statusFilter}</Label>
                        <Select
                          id="provider-history-status-filter"
                          onChange={(event) =>
                            setHistoryStatus(
                              event.currentTarget.value as 'all' | 'failed' | 'succeeded' | 'cancelled',
                            )
                          }
                          value={historyStatus}
                        >
                          <option value="all">{copy.statuses.all}</option>
                          <option value="failed">{copy.statuses.failedOnly}</option>
                          <option value="succeeded">{copy.statuses.succeededOnly}</option>
                          <option value="cancelled">{copy.statuses.cancelledOnly}</option>
                        </Select>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-history-scope-filter">{copy.providerScope}</Label>
                        <Select
                          id="provider-history-scope-filter"
                          onChange={(event) =>
                            setHistoryScope(event.currentTarget.value as 'selected' | 'all')
                          }
                          value={historyScope}
                        >
                          <option value="selected">{copy.selectedProvider}</option>
                          <option value="all">{copy.allProviders}</option>
                        </Select>
                      </ClearBox>
                      <ClearBox style={providerSettingsFieldStyle}>
                        <Label htmlFor="provider-history-limit-filter">{copy.historyWindow}</Label>
                        <Select
                          id="provider-history-limit-filter"
                          onChange={(event) =>
                            setHistoryLimit(Number.parseInt(event.currentTarget.value, 10))
                          }
                          value={String(historyLimit)}
                        >
                          {providerGatewayHistoryPageOptions.map((limit) => (
                            <option key={limit} value={String(limit)}>
                              {copy.runs(limit)}
                            </option>
                          ))}
                        </Select>
                        <Text style={providerSettingsStatusMessageStyle}>
                          {copy.showingRuns(historyRuns.length, historyTotal, historyOffset)}
                        </Text>
                      </ClearBox>
                    </ClearBox>
                    {historyErrorMessage ? (
                      <Text style={providerSettingsErrorMessageStyle}>
                        {copy.providerActivityUnavailable(historyErrorMessage)}
                      </Text>
                    ) : null}
                    <ClearBox style={{ display: 'grid', gap: 'var(--gap-xs)' }}>
                      {isHistoryLoading ? (
                        <Text style={providerSettingsStatusMessageStyle}>{copy.loadingProviderActivity}</Text>
                      ) : historyRuns.length ? (
                        historyRuns.map((run: AgentProviderGatewayRun) => (
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
                              {formatGatewayStatus(run.status, copy)}
                            </Text>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {run.request_mode} · {run.model || copy.defaultModel} ·{' '}
                              {formatDuration(run.duration_ms)} · first{' '}
                              {formatDuration(run.first_response_latency_ms)} ·{' '}
                              {formatRunTimestamp(run.completed_at, copy)}
                            </Text>
                            {run.error_message ? (
                              <Text style={providerSettingsErrorMessageStyle}>{run.error_message}</Text>
                            ) : null}
                          </ClearBox>
                        ))
                      ) : (
                        <Text style={providerSettingsStatusMessageStyle}>{copy.noProviderActivity}</Text>
                      )}
                    </ClearBox>
                    {historyHasMore ? (
                      <Button disabled={isHistoryLoading} onClick={loadMoreHistory}>
                        {isHistoryLoading ? copy.loadingModels : copy.loadMoreHistory}
                      </Button>
                    ) : null}
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
                          <Text style={{ fontWeight: 600 }}>{copy.runDiagnostics}</Text>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {copy.runDiagnosticsDescription}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsGridStyle}>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.provider}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.provider_display_name || selectedHistoryRun.provider_id}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.status}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatGatewayStatus(selectedHistoryRun.status, copy)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.errorClass}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatProviderGatewayErrorCode(selectedHistoryRun.error_code) || copy.unknown}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.conversation}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.conversation_id || copy.unknown}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.requestMode}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.request_mode}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.actor}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.actor_username || copy.unknown}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.model}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.model || copy.defaultModel}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.resolvedRoute}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.resolved_binary ||
                                selectedHistoryRun.base_url ||
                                copy.unknown}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.firstResponse}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatDuration(selectedHistoryRun.first_response_latency_ms)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.routeState}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {selectedHistoryRun.route_status_state || 'unchecked'} ·{' '}
                              {selectedHistoryRun.route_prepare_state || 'unprepared'}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.totalDuration}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatDuration(selectedHistoryRun.duration_ms)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.started}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatRunTimestamp(selectedHistoryRun.started_at, copy)}
                            </Text>
                          </ClearBox>
                          <ClearBox style={providerSettingsFieldStyle}>
                            <Label>{copy.completed}</Label>
                            <Text style={providerSettingsStatusMessageStyle}>
                              {formatRunTimestamp(selectedHistoryRun.completed_at, copy)}
                            </Text>
                          </ClearBox>
                        </ClearBox>
                        {selectedHistoryRun.error_message ? (
                          <Text style={providerSettingsErrorMessageStyle}>
                            {selectedHistoryRun.error_message}
                          </Text>
                        ) : null}
                        {selectedHistoryRun.route_status_message ? (
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedHistoryRun.route_status_message}
                          </Text>
                        ) : null}
                        {selectedHistoryRun.route_prepare_message ? (
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedHistoryRun.route_prepare_message}
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
                      <Text style={providerSettingsStatusMessageStyle}>{copy.loading}</Text>
                    ) : null}
                  </ClearBox>
                  <ClearBox style={providerSettingsActionsGroupStyle}>
                    <Button disabled={isSaving} onClick={resetDraft}>
                      {copy.reset}
                    </Button>
                    {draft.mode === 'existing' ? (
                      <Button
                        disabled={isSaving || selectedProvider?.active}
                        onClick={() => void activateSelectedProvider()}
                      >
                        {copy.activate}
                      </Button>
                    ) : null}
                    {draft.mode === 'existing' ? (
                      <Button
                        disabled={isSaving || selectedProvider?.active}
                        onClick={() => void removeSelectedProvider()}
                      >
                        {copy.delete}
                      </Button>
                    ) : null}
                    <Button disabled={isSaving} onClick={() => void saveDraft()}>
                      {isSaving ? copy.saving : draft.mode === 'new' ? copy.createProvider : copy.saveChanges}
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
