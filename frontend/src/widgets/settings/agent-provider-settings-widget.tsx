import { useId } from 'react'

import type { AgentProviderKind } from '@/features/agent/api/provider-client'
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
}

const defaultSupportedKinds: AgentProviderKind[] = ['codex', 'claude']

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
      return 'CLI ready'
    case 'auth-required':
      return 'Login required'
    default:
      return 'CLI missing'
  }
}

export function AgentProviderSettingsWidget({ embedded = false }: { embedded?: boolean }) {
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
    (kind) => kind === 'codex' || kind === 'claude',
  )
  const toolbarStyle = embedded ? providerSettingsEmbeddedToolbarStyle : providerSettingsToolbarStyle
  const bodyStyle = embedded ? providerSettingsEmbeddedBodyStyle : providerSettingsBodyStyle
  const sidebarStyle = embedded ? providerSettingsEmbeddedSidebarStyle : providerSettingsSidebarStyle
  const editorStyle = embedded ? providerSettingsEmbeddedEditorStyle : providerSettingsEditorStyle

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
                        {provider.codex?.model} · {formatCLIStatus(provider.codex?.status_state)}
                      </Text>
                    ) : provider.kind === 'claude' ? (
                      <Text style={providerSettingsStatusMessageStyle}>
                        {provider.claude?.model} · {formatCLIStatus(provider.claude?.status_state)}
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
                            {selectedProvider?.codex?.status_message ??
                              'Save the provider to let the backend inspect the local Codex CLI command.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Resolved binary</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.codex?.resolved_binary || 'Unknown until saved'}
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
                            {selectedProvider?.claude?.status_message ??
                              'Save the provider to let the backend inspect the local Claude Code CLI command.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={providerSettingsFieldStyle}>
                          <Label>Resolved binary</Label>
                          <Text style={providerSettingsStatusMessageStyle}>
                            {selectedProvider?.claude?.resolved_binary || 'Unknown until saved'}
                          </Text>
                        </ClearBox>
                      </ClearBox>
                    </ClearBox>
                  ) : null}
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
