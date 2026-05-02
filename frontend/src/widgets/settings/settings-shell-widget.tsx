import { ChevronDown, ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { AgentProviderGatewayProvider, AgentProviderView } from '@/features/agent/api/provider-client'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { getActiveDockviewApi } from '@/shared/model/dockview-api-registry'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { ClearBox } from '@/shared/ui/components'
import { Button, Checkbox, ScrollArea, Text } from '@/shared/ui/primitives'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'
import { AiComposerSettingsSection } from '@/widgets/settings/ai-composer-settings-section'
import { MCPSettingsSection } from '@/widgets/settings/mcp-settings-section'
import { PluginsSettingsSection } from '@/widgets/settings/plugins-settings-section'
import { RemoteProfilesSettingsSection } from '@/widgets/settings/remote-profiles-settings-section'
import { RuntimeSettingsSection } from '@/widgets/settings/runtime-settings-section'
import { TerminalSettingsSection } from '@/widgets/settings/terminal-settings-section'
import {
  settingsShellBadgeStyle,
  settingsShellCardsGridStyle,
  settingsShellContentHeaderStyle,
  settingsShellContentPanelStyle,
  settingsShellContentScrollStyle,
  settingsShellContentStyle,
  settingsShellEyebrowStyle,
  settingsShellErrorTextStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellNavButtonStyle,
  settingsShellNestedNavStyle,
  settingsShellParentNavStyle,
  settingsShellRootStyle,
  settingsShellSectionCardStyle,
  settingsShellShellHeaderStyle,
  settingsShellSidebarSectionStyle,
  settingsShellSidebarSectionSpacingStyle,
  settingsShellSidebarStyle,
} from '@/widgets/settings/settings-shell-widget.styles'
import {
  settingsShellCopy,
  type SettingsSectionID,
  type SettingsSectionMeta,
} from '@/widgets/settings/settings-shell-copy'

const providerKindLabels: Record<AgentProviderView['kind'], string> = {
  codex: 'Codex CLI',
  claude: 'Claude Code CLI',
  'openai-compatible': 'OpenAI-compatible HTTP',
}

function buildSettingsSectionMeta(
  copy: (typeof settingsShellCopy)[keyof typeof settingsShellCopy],
): Record<SettingsSectionID, SettingsSectionMeta> {
  return copy.sections
}

function navButtonStateStyle(isActive: boolean) {
  return {
    ...settingsShellNavButtonStyle,
    background: isActive
      ? 'color-mix(in srgb, var(--color-surface-glass-strong) 78%, transparent)'
      : 'transparent',
    borderColor: isActive ? 'var(--color-border-strong, var(--color-border-subtle))' : 'transparent',
    boxShadow: isActive ? 'inset 2px 0 0 var(--color-accent-emerald-strong)' : 'none',
  }
}

function uniqueModelIDs(models: string[]) {
  const seen = new Set<string>()
  const nextModels: string[] = []

  for (const rawModel of models) {
    const model = rawModel.trim()
    if (!model || seen.has(model)) {
      continue
    }
    seen.add(model)
    nextModels.push(model)
  }

  return nextModels
}

function directProviderDefaultModel(provider: AgentProviderView | null | undefined) {
  if (!provider) {
    return ''
  }
  if (provider.kind === 'codex') {
    return provider.codex?.model?.trim() ?? ''
  }
  if (provider.kind === 'claude') {
    return provider.claude?.model?.trim() ?? ''
  }
  if (provider.kind === 'openai-compatible') {
    return provider.openai_compatible?.model?.trim() ?? ''
  }
  return ''
}

function directProviderChatModels(provider: AgentProviderView | null | undefined) {
  if (!provider) {
    return []
  }
  if (provider.kind === 'codex') {
    return provider.codex?.chat_models ?? []
  }
  if (provider.kind === 'claude') {
    return provider.claude?.chat_models ?? []
  }
  if (provider.kind === 'openai-compatible') {
    return provider.openai_compatible?.chat_models ?? []
  }
  return []
}

function findGatewayProvider(
  providerID: string,
  gatewayProviders: AgentProviderGatewayProvider[] | null | undefined,
) {
  return gatewayProviders?.find((provider) => provider.provider_id === providerID) ?? null
}

function formatProviderRouteState(
  state: string | undefined,
  copy: (typeof settingsShellCopy)[keyof typeof settingsShellCopy],
) {
  switch (state) {
    case 'ready':
      return copy.providerRouteStates.ready
    case 'auth-required':
      return copy.providerRouteStates.authRequired
    case 'disabled':
      return copy.providerRouteStates.disabled
    case 'unchecked':
      return copy.providerRouteStates.unchecked
    case 'unreachable':
      return copy.providerRouteStates.unreachable
    case 'model-unavailable':
      return copy.providerRouteStates.modelUnavailable
    default:
      return copy.providerRouteStates.needsAttention
  }
}

function describeProviderConnection(
  provider: AgentProviderView,
  gatewayProvider: AgentProviderGatewayProvider | null,
  copy: (typeof settingsShellCopy)[keyof typeof settingsShellCopy],
) {
  if (gatewayProvider?.route_status_message?.trim()) {
    return gatewayProvider.route_status_message
  }

  if (provider.kind === 'codex') {
    return copy.aiModels.routeNotProbedCodex
  }

  if (provider.kind === 'claude') {
    return copy.aiModels.routeNotProbedClaude
  }

  if (provider.kind === 'openai-compatible') {
    return (
      gatewayProvider?.base_url ?? provider.openai_compatible?.base_url ?? copy.aiModels.routeNotConfigured
    )
  }

  return copy.aiModels.routeUnknown
}

function describeProviderLimitState(
  provider: AgentProviderView,
  gatewayProvider: AgentProviderGatewayProvider | null,
  copy: (typeof settingsShellCopy)[keyof typeof settingsShellCopy],
) {
  if (!provider.enabled) {
    return copy.aiLimits.routeDisabled
  }

  if (provider.active) {
    return copy.aiLimits.routeActive
  }

  if (gatewayProvider?.route_status_state === 'ready') {
    return copy.aiLimits.routeReady
  }
  if (gatewayProvider?.route_status_state === 'auth-required') {
    return copy.aiLimits.routeAuthRequired
  }
  if (gatewayProvider?.route_status_state === 'unchecked') {
    return copy.aiLimits.routeUnchecked
  }

  if (provider.kind === 'openai-compatible') {
    return provider.enabled ? copy.aiLimits.routeConfiguredHttp : copy.aiLimits.routeDisabledHttp
  }

  return copy.aiLimits.routeUnknown
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </ClearBox>
      {children}
    </ClearBox>
  )
}

function GeneralSection() {
  return <RuntimeSettingsSection />
}

function AiModelsSection() {
  const { locale } = useAppLocale()
  const copy = settingsShellCopy[locale]
  const {
    availableModels,
    catalog,
    errorMessage,
    gateway,
    isLoading,
    isLoadingModels,
    isSaving,
    modelErrorMessage,
    refreshAvailableModels,
    selectProvider,
    selectedProvider,
    selectedProviderID,
    statusMessage,
    updateProviderChatModels,
  } = useAgentProviderSettings()

  const directProviders = useMemo(() => catalog?.providers ?? [], [catalog])

  useEffect(() => {
    if (directProviders.length === 0) {
      return
    }

    const hasSelectedDirectProvider = directProviders.some((provider) => provider.id === selectedProviderID)

    if (!hasSelectedDirectProvider) {
      selectProvider(directProviders[0].id)
    }
  }, [directProviders, selectProvider, selectedProviderID])

  const activeProvider =
    selectedProvider ??
    directProviders.find((provider) => provider.id === selectedProviderID) ??
    directProviders[0] ??
    null
  const configuredModel = directProviderDefaultModel(activeProvider)
  const selectedChatModels = directProviderChatModels(activeProvider)
  const visibleModels = useMemo(
    () => uniqueModelIDs([configuredModel, ...(selectedChatModels ?? []), ...(availableModels ?? [])]),
    [availableModels, configuredModel, selectedChatModels],
  )

  return (
    <SectionCard description={copy.aiModels.sectionDescription} title={copy.aiModels.availableModelsTitle}>
      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>{copy.aiModels.loadingProviders}</Text>
      ) : directProviders.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>{copy.aiModels.noProviders}</Text>
      ) : (
        <>
          <ClearBox style={settingsShellCardsGridStyle}>
            {directProviders.map((provider) => {
              const isActive = provider.id === activeProvider?.id

              return (
                <Button
                  aria-pressed={isActive}
                  key={provider.id}
                  onClick={() => selectProvider(provider.id)}
                  style={navButtonStateStyle(isActive)}
                >
                  <Text style={{ fontWeight: 600 }}>
                    {provider.display_name || providerKindLabels[provider.kind]}
                  </Text>
                  <Text style={settingsShellMutedTextStyle}>{providerKindLabels[provider.kind]}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {describeProviderConnection(
                      provider,
                      findGatewayProvider(provider.id, gateway?.providers ?? null),
                      copy,
                    )}
                  </Text>
                </Button>
              )
            })}
          </ClearBox>

          {activeProvider ? (
            <ClearBox style={{ ...settingsShellSectionCardStyle, paddingBottom: 0, borderTop: 'none' }}>
              <ClearBox style={settingsShellContentHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>
                  {activeProvider.display_name || providerKindLabels[activeProvider.kind]}
                </Text>
                <Text style={settingsShellMutedTextStyle}>
                  {activeProvider.active ? copy.aiModels.providerActive : copy.aiModels.providerAvailable}
                </Text>
              </ClearBox>
              <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                <Button disabled={isLoadingModels} onClick={() => void refreshAvailableModels()}>
                  {isLoadingModels ? copy.aiModels.loadingShort : copy.aiModels.refreshModels}
                </Button>
                <ClearBox style={settingsShellBadgeStyle}>
                  {copy.aiModels.countModels(availableModels.length)}
                </ClearBox>
              </ClearBox>
              {errorMessage ? <Text style={settingsShellErrorTextStyle}>{errorMessage}</Text> : null}
              {modelErrorMessage ? (
                <Text style={settingsShellErrorTextStyle}>{modelErrorMessage}</Text>
              ) : null}
              {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
              {!errorMessage && !modelErrorMessage && visibleModels.length === 0 ? (
                <Text style={settingsShellMutedTextStyle}>{copy.aiModels.noDiscoveredModels}</Text>
              ) : null}
              {visibleModels.length > 0 ? (
                <ClearBox style={settingsShellListStyle}>
                  {visibleModels.map((model) => {
                    const isDefaultModel = model === configuredModel
                    const isEnabledInChat = selectedChatModels.includes(model) || isDefaultModel

                    return (
                      <ClearBox key={model} style={settingsShellListRowStyle}>
                        <ClearBox style={settingsShellContentHeaderStyle}>
                          <Text style={{ fontWeight: 600 }}>{model}</Text>
                          <Text style={settingsShellMutedTextStyle}>
                            {isDefaultModel
                              ? copy.aiModels.defaultModelDescription
                              : copy.aiModels.enabledModelDescription}
                          </Text>
                        </ClearBox>
                        <ClearBox style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
                          {isDefaultModel ? (
                            <ClearBox style={settingsShellBadgeStyle}>{copy.aiModels.defaultBadge}</ClearBox>
                          ) : null}
                          <Checkbox
                            aria-label={copy.aiModels.exposeModelAriaLabel(model)}
                            checked={isEnabledInChat}
                            disabled={isSaving || isLoadingModels || isDefaultModel}
                            onChange={(event) => {
                              if (!activeProvider) {
                                return
                              }

                              const nextChatModels = event.currentTarget.checked
                                ? uniqueModelIDs([...(selectedChatModels ?? []), model])
                                : (selectedChatModels ?? []).filter((entry) => entry !== model)

                              void updateProviderChatModels(activeProvider, nextChatModels)
                            }}
                          />
                        </ClearBox>
                      </ClearBox>
                    )
                  })}
                </ClearBox>
              ) : null}
            </ClearBox>
          ) : null}
        </>
      )}
    </SectionCard>
  )
}

function AiLimitsSection() {
  const { locale } = useAppLocale()
  const copy = settingsShellCopy[locale]
  const { catalog, gateway, isLoading } = useAgentProviderSettings()

  return (
    <SectionCard description={copy.aiLimits.description} title={copy.aiLimits.title}>
      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>{copy.aiLimits.loading}</Text>
      ) : !catalog?.providers.length ? (
        <Text style={settingsShellMutedTextStyle}>{copy.aiLimits.noProviders}</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {catalog.providers.map((provider) => (
            <ClearBox key={provider.id} style={settingsShellListRowStyle}>
              <ClearBox style={settingsShellContentHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>
                  {provider.display_name || providerKindLabels[provider.kind]}
                </Text>
                <Text style={settingsShellMutedTextStyle}>
                  {describeProviderLimitState(
                    provider,
                    findGatewayProvider(provider.id, gateway?.providers ?? null),
                    copy,
                  )}
                </Text>
              </ClearBox>
              <ClearBox style={settingsShellBadgeStyle}>
                {provider.active
                  ? copy.aiLimits.activeBadge
                  : formatProviderRouteState(
                      findGatewayProvider(provider.id, gateway?.providers ?? null)?.route_status_state,
                      copy,
                    ).toLowerCase()}
              </ClearBox>
            </ClearBox>
          ))}
        </ClearBox>
      )}
    </SectionCard>
  )
}

function TerminalSection() {
  return <TerminalSettingsSection />
}

function RemoteSection() {
  return <RemoteProfilesSettingsSection dockviewApi={getActiveDockviewApi()} />
}

function MCPSection() {
  return <MCPSettingsSection />
}

function CommanderSection() {
  const { locale } = useAppLocale()
  const copy = settingsShellCopy[locale]
  return (
    <SectionCard description={copy.commander.description} title={copy.commander.title}>
      <ClearBox style={settingsShellListRowStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>{copy.commander.preferencesTitle}</Text>
          <Text style={settingsShellMutedTextStyle}>{copy.commander.notConnected}</Text>
        </ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>{copy.commander.planned}</ClearBox>
      </ClearBox>
    </SectionCard>
  )
}

function AIAppsSection() {
  const { locale } = useAppLocale()
  return <AgentProviderSettingsWidget embedded locale={locale} />
}

function PluginsSection() {
  return <PluginsSettingsSection />
}

function renderSection(sectionID: SettingsSectionID) {
  switch (sectionID) {
    case 'general':
      return <GeneralSection />
    case 'ai-apps':
      return <AIAppsSection />
    case 'ai-models':
      return <AiModelsSection />
    case 'ai-composer':
      return <AiComposerSettingsSection />
    case 'ai-limits':
      return <AiLimitsSection />
    case 'terminal':
      return <TerminalSection />
    case 'remote':
      return <RemoteSection />
    case 'mcp':
      return <MCPSection />
    case 'plugins':
      return <PluginsSection />
    case 'commander':
      return <CommanderSection />
    default:
      return <GeneralSection />
  }
}

export function SettingsShellWidget() {
  const { locale } = useAppLocale()
  const copy = settingsShellCopy[locale]
  const settingsSectionMeta = useMemo(() => buildSettingsSectionMeta(copy), [copy])
  const [activeSectionID, setActiveSectionID] = useState<SettingsSectionID>('ai-apps')
  const [isAiExpanded, setIsAiExpanded] = useState(true)

  useEffect(() => {
    if (activeSectionID.startsWith('ai-')) {
      setIsAiExpanded(true)
    }
  }, [activeSectionID])

  const isAiSectionActive = activeSectionID.startsWith('ai-')
  const activeMeta = settingsSectionMeta[activeSectionID]

  const handleToggleAiSection = () => {
    setIsAiExpanded((current) => {
      const next = !current
      if (next && !isAiSectionActive) {
        setActiveSectionID('ai-apps')
      }
      return next
    })
  }

  return (
    <RunaDomScopeProvider component="settings-shell-widget">
      <ClearBox runaComponent="settings-shell-root" style={settingsShellRootStyle}>
        <ClearBox runaComponent="settings-shell-sidebar" style={settingsShellSidebarStyle}>
          <ClearBox style={settingsShellSidebarSectionStyle}>
            <Button
              aria-pressed={activeSectionID === 'general'}
              onClick={() => setActiveSectionID('general')}
              style={navButtonStateStyle(activeSectionID === 'general')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.general.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.general.navDescription}</Text>
            </Button>
          </ClearBox>

          <ClearBox
            style={{ ...settingsShellSidebarSectionStyle, ...settingsShellSidebarSectionSpacingStyle }}
          >
            <Button
              aria-expanded={isAiExpanded}
              onClick={handleToggleAiSection}
              style={navButtonStateStyle(false)}
            >
              <ClearBox style={settingsShellParentNavStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{copy.aiParent.title}</Text>
                  <Text style={settingsShellMutedTextStyle}>{copy.aiParent.description}</Text>
                </ClearBox>
                {isAiExpanded ? (
                  <ChevronDown size={16} strokeWidth={1.8} />
                ) : (
                  <ChevronRight size={16} strokeWidth={1.8} />
                )}
              </ClearBox>
            </Button>
            {isAiExpanded ? (
              <ClearBox style={settingsShellNestedNavStyle}>
                <Button
                  aria-pressed={activeSectionID === 'ai-apps'}
                  onClick={() => setActiveSectionID('ai-apps')}
                  style={navButtonStateStyle(activeSectionID === 'ai-apps')}
                >
                  <Text style={{ fontWeight: 600 }}>{settingsSectionMeta['ai-apps'].navTitle}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {settingsSectionMeta['ai-apps'].navDescription}
                  </Text>
                </Button>
                <Button
                  aria-pressed={activeSectionID === 'ai-models'}
                  onClick={() => setActiveSectionID('ai-models')}
                  style={navButtonStateStyle(activeSectionID === 'ai-models')}
                >
                  <Text style={{ fontWeight: 600 }}>{settingsSectionMeta['ai-models'].navTitle}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {settingsSectionMeta['ai-models'].navDescription}
                  </Text>
                </Button>
                <Button
                  aria-pressed={activeSectionID === 'ai-composer'}
                  onClick={() => setActiveSectionID('ai-composer')}
                  style={navButtonStateStyle(activeSectionID === 'ai-composer')}
                >
                  <Text style={{ fontWeight: 600 }}>{settingsSectionMeta['ai-composer'].navTitle}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {settingsSectionMeta['ai-composer'].navDescription}
                  </Text>
                </Button>
                <Button
                  aria-pressed={activeSectionID === 'ai-limits'}
                  onClick={() => setActiveSectionID('ai-limits')}
                  style={navButtonStateStyle(activeSectionID === 'ai-limits')}
                >
                  <Text style={{ fontWeight: 600 }}>{settingsSectionMeta['ai-limits'].navTitle}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {settingsSectionMeta['ai-limits'].navDescription}
                  </Text>
                </Button>
              </ClearBox>
            ) : null}
          </ClearBox>

          <ClearBox
            style={{ ...settingsShellSidebarSectionStyle, ...settingsShellSidebarSectionSpacingStyle }}
          >
            <Button
              aria-pressed={activeSectionID === 'terminal'}
              onClick={() => setActiveSectionID('terminal')}
              style={navButtonStateStyle(activeSectionID === 'terminal')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.terminal.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.terminal.navDescription}</Text>
            </Button>
            <Button
              aria-pressed={activeSectionID === 'remote'}
              onClick={() => setActiveSectionID('remote')}
              style={navButtonStateStyle(activeSectionID === 'remote')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.remote.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.remote.navDescription}</Text>
            </Button>
            <Button
              aria-pressed={activeSectionID === 'mcp'}
              onClick={() => setActiveSectionID('mcp')}
              style={navButtonStateStyle(activeSectionID === 'mcp')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.mcp.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.mcp.navDescription}</Text>
            </Button>
            <Button
              aria-pressed={activeSectionID === 'plugins'}
              onClick={() => setActiveSectionID('plugins')}
              style={navButtonStateStyle(activeSectionID === 'plugins')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.plugins.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.plugins.navDescription}</Text>
            </Button>
          </ClearBox>

          <ClearBox
            style={{ ...settingsShellSidebarSectionStyle, ...settingsShellSidebarSectionSpacingStyle }}
          >
            <Button
              aria-pressed={activeSectionID === 'commander'}
              onClick={() => setActiveSectionID('commander')}
              style={navButtonStateStyle(activeSectionID === 'commander')}
            >
              <Text style={{ fontWeight: 600 }}>{settingsSectionMeta.commander.navTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{settingsSectionMeta.commander.navDescription}</Text>
            </Button>
          </ClearBox>
        </ClearBox>

        <ClearBox runaComponent="settings-shell-content" style={settingsShellContentStyle}>
          <ClearBox style={settingsShellContentPanelStyle}>
            <ClearBox style={settingsShellShellHeaderStyle}>
              <Text style={settingsShellEyebrowStyle}>{activeMeta.groupLabel}</Text>
              <Text style={{ fontWeight: 600 }}>{activeMeta.shellTitle}</Text>
              <Text style={settingsShellMutedTextStyle}>{activeMeta.shellDescription}</Text>
            </ClearBox>
            <ScrollArea runaComponent="settings-shell-content-scroll" style={settingsShellContentScrollStyle}>
              {renderSection(activeSectionID)}
            </ScrollArea>
          </ClearBox>
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
