import { ChevronDown, ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { AgentProviderView } from '@/features/agent/api/provider-client'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { ClearBox } from '@/shared/ui/components'
import { Button, Checkbox, ScrollArea, Text } from '@/shared/ui/primitives'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'
import { AiComposerSettingsSection } from '@/widgets/settings/ai-composer-settings-section'
import { MCPSettingsSection } from '@/widgets/settings/mcp-settings-section'
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
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellNavButtonStyle,
  settingsShellNestedNavStyle,
  settingsShellParentNavStyle,
  settingsShellRootStyle,
  settingsShellSectionCardStyle,
  settingsShellShellHeaderStyle,
  settingsShellSidebarHeaderStyle,
  settingsShellSidebarSectionStyle,
  settingsShellSidebarSectionSpacingStyle,
  settingsShellSidebarStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type SettingsSectionID =
  | 'general'
  | 'ai-apps'
  | 'ai-models'
  | 'ai-composer'
  | 'ai-limits'
  | 'mcp'
  | 'remote'
  | 'terminal'
  | 'commander'
type SettingsSectionMeta = {
  navTitle: string
  navDescription: string
  shellTitle: string
  shellDescription: string
  groupLabel: string
}

const providerKindLabels: Record<AgentProviderView['kind'], string> = {
  codex: 'Codex CLI',
  claude: 'Claude Code CLI',
  'openai-compatible': 'OpenAI-Compatible HTTP',
}

const settingsSectionMeta: Record<SettingsSectionID, SettingsSectionMeta> = {
  general: {
    navTitle: 'Основные',
    navDescription: 'Runtime mode и shell bootstrap context.',
    shellTitle: 'Основные',
    shellDescription: 'Desktop runtime lifecycle, close-window semantics и текущий shell bootstrap context.',
    groupLabel: 'General',
  },
  'ai-apps': {
    navTitle: 'Установленные приложения',
    navDescription: 'CLI и HTTP providers для AI runtime.',
    shellTitle: 'AI / Установленные приложения',
    shellDescription:
      'Управление CLI и OpenAI-compatible HTTP провайдерами, их доступностью в рантайме и параметрами подключения без выхода из общего settings shell.',
    groupLabel: 'AI',
  },
  'ai-models': {
    navTitle: 'Модели',
    navDescription: 'Список моделей, доступных в чате.',
    shellTitle: 'AI / Модели',
    shellDescription:
      'Каталог моделей, которые backend вернул для активных CLI-провайдеров, и их экспозиция в основном AI чате.',
    groupLabel: 'AI',
  },
  'ai-composer': {
    navTitle: 'Composer',
    navDescription: 'Поведение Enter / Shift+Enter в чате.',
    shellTitle: 'AI / Composer',
    shellDescription:
      'Runtime-backed keyboard behavior for the AI composer: send/newline shortcut selection stored in the shared settings contract.',
    groupLabel: 'AI',
  },
  'ai-limits': {
    navTitle: 'Лимиты',
    navDescription: 'Готовность и будущие quota surfaces.',
    shellTitle: 'AI / Лимиты',
    shellDescription:
      'Текущий readiness surface провайдеров. Полноценные quota и rate-limit контракты будут добавлены отдельным backend шагом.',
    groupLabel: 'AI',
  },
  terminal: {
    navTitle: 'Terminal',
    navDescription: 'Настройки терминального runtime.',
    shellTitle: 'Terminal',
    shellDescription:
      'Отдельная точка входа для terminal runtime и будущих терминальных preferences, без смешения с общими или AI настройками.',
    groupLabel: 'Runtime',
  },
  remote: {
    navTitle: 'Remote',
    navDescription: 'SSH profiles and config import.',
    shellTitle: 'Remote',
    shellDescription:
      'Backend-owned SSH profiles, narrow ~/.ssh/config import, and explicit limits around advanced remote topology.',
    groupLabel: 'Runtime',
  },
  mcp: {
    navTitle: 'MCP',
    navDescription: 'External server registration and lifecycle.',
    shellTitle: 'MCP',
    shellDescription:
      'Register remote MCP endpoints and control lifecycle state through the backend-owned MCP runtime without adding implicit AI context injection.',
    groupLabel: 'Runtime',
  },
  commander: {
    navTitle: 'Commander',
    navDescription: 'Настройки file-manager surface.',
    shellTitle: 'Commander',
    shellDescription:
      'Навигационный surface для file-manager и dual-pane поведения. Здесь будут появляться commander-specific опции по мере выведения их из widget-local state.',
    groupLabel: 'Workspace',
  },
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

function describeProviderConnection(provider: AgentProviderView) {
  if (provider.kind === 'codex') {
    return provider.codex?.status_message ?? 'Codex CLI command will be resolved by the backend.'
  }

  if (provider.kind === 'claude') {
    return provider.claude?.status_message ?? 'Claude Code CLI command will be resolved by the backend.'
  }

  if (provider.kind === 'openai-compatible') {
    return provider.openai_compatible?.base_url ?? 'OpenAI-compatible source URL is not configured.'
  }

  return 'Unknown provider connection state.'
}

function describeProviderLimitState(provider: AgentProviderView) {
  if (!provider.enabled) {
    return 'Disabled provider; chat will not route requests here.'
  }

  if (provider.active) {
    return 'Active provider for the current chat runtime.'
  }

  if (provider.kind === 'codex') {
    return provider.codex?.status_state === 'ready'
      ? 'Codex CLI command is available.'
      : provider.codex?.status_state === 'auth-required'
        ? 'Needs a local Codex CLI login.'
        : 'Needs a valid local Codex CLI install.'
  }

  if (provider.kind === 'claude') {
    return provider.claude?.status_state === 'ready'
      ? 'Claude Code CLI command is available.'
      : provider.claude?.status_state === 'auth-required'
        ? 'Needs a local Claude Code CLI login.'
        : 'Needs a valid local Claude Code CLI install.'
  }

  if (provider.kind === 'openai-compatible') {
    return provider.enabled
      ? 'HTTP source is configured. Use model refresh to validate the remote catalog.'
      : 'Disabled HTTP source; chat will not route requests here.'
  }

  return 'Unknown provider readiness.'
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
  const {
    availableModels,
    catalog,
    errorMessage,
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
    <SectionCard
      description="Переключай провайдера, чтобы увидеть auto-discovered catalog, который доступен для выбора в чате."
      title="Доступные модели"
    >
      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Загружаю каталог провайдеров…</Text>
      ) : directProviders.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>
          Прямых AI-провайдеров пока нет. Сначала добавь CLI или HTTP source в разделе `Установленные
          приложения`.
        </Text>
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
                  <Text style={settingsShellMutedTextStyle}>{describeProviderConnection(provider)}</Text>
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
                  {activeProvider.active
                    ? 'Сейчас активен в runtime.'
                    : 'Доступен для активации в provider catalog.'}
                </Text>
              </ClearBox>
              <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                <Button disabled={isLoadingModels} onClick={() => void refreshAvailableModels()}>
                  {isLoadingModels ? 'Loading…' : 'Refresh models'}
                </Button>
                <ClearBox style={settingsShellBadgeStyle}>
                  {availableModels.length} model{availableModels.length === 1 ? '' : 's'}
                </ClearBox>
              </ClearBox>
              {errorMessage ? (
                <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
              ) : null}
              {modelErrorMessage ? (
                <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{modelErrorMessage}</Text>
              ) : null}
              {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
              {!errorMessage && !modelErrorMessage && visibleModels.length === 0 ? (
                <Text style={settingsShellMutedTextStyle}>
                  Для этого провайдера backend пока не вернул модели.
                </Text>
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
                              ? 'Базовая модель провайдера. Всегда доступна в основном AI интерфейсе.'
                              : 'Включай, чтобы модель появилась в dropdown главного AI чата.'}
                          </Text>
                        </ClearBox>
                        <ClearBox style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
                          {isDefaultModel ? (
                            <ClearBox style={settingsShellBadgeStyle}>default</ClearBox>
                          ) : null}
                          <Checkbox
                            aria-label={`Expose ${model} in the main AI model selector`}
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
  const { catalog, isLoading } = useAgentProviderSettings()

  return (
    <SectionCard
      description="Сейчас здесь выводится только готовность каналов для чата. Реальные лимиты появятся после backend-owned quota surface."
      title="Статус провайдеров"
    >
      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Загружаю provider catalog…</Text>
      ) : !catalog?.providers.length ? (
        <Text style={settingsShellMutedTextStyle}>Провайдеров пока нет.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {catalog.providers.map((provider) => (
            <ClearBox key={provider.id} style={settingsShellListRowStyle}>
              <ClearBox style={settingsShellContentHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>
                  {provider.display_name || providerKindLabels[provider.kind]}
                </Text>
                <Text style={settingsShellMutedTextStyle}>{describeProviderLimitState(provider)}</Text>
              </ClearBox>
              <ClearBox style={settingsShellBadgeStyle}>
                {provider.active ? 'active' : provider.enabled ? 'ready' : 'disabled'}
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
  return <RemoteProfilesSettingsSection />
}

function MCPSection() {
  return <MCPSettingsSection />
}

function CommanderSection() {
  return (
    <SectionCard
      description="Этот раздел подготовлен для commander-specific options, когда они будут выведены из widget-local state."
      title="Состояние раздела"
    >
      <ClearBox style={settingsShellListRowStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>Commander preferences</Text>
          <Text style={settingsShellMutedTextStyle}>
            Отдельный конфигурационный surface для commander ещё не подключён.
          </Text>
        </ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>Planned</ClearBox>
      </ClearBox>
    </SectionCard>
  )
}

function renderSection(sectionID: SettingsSectionID) {
  switch (sectionID) {
    case 'general':
      return <GeneralSection />
    case 'ai-apps':
      return <AgentProviderSettingsWidget embedded />
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
    case 'commander':
      return <CommanderSection />
    default:
      return <GeneralSection />
  }
}

export function SettingsShellWidget() {
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
          <ClearBox style={settingsShellSidebarHeaderStyle}>
            <Text style={settingsShellEyebrowStyle}>Rune Terminal</Text>
            <Text style={{ fontWeight: 600 }}>Settings</Text>
            <Text style={settingsShellMutedTextStyle}>
              Общий навигатор по shell, AI runtime, terminal, remote, MCP и commander surface.
            </Text>
          </ClearBox>
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
                  <Text style={{ fontWeight: 600 }}>AI</Text>
                  <Text style={settingsShellMutedTextStyle}>Провайдеры, модели и лимиты чата.</Text>
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
