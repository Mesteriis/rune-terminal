import { ChevronDown, ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { AgentProviderView } from '@/features/agent/api/provider-client'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { ClearBox } from '@/shared/ui/components'
import { Button, Checkbox, ScrollArea, Text } from '@/shared/ui/primitives'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'
import {
  settingsShellBadgeStyle,
  settingsShellCardsGridStyle,
  settingsShellContentHeaderStyle,
  settingsShellContentScrollStyle,
  settingsShellContentStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellNavButtonStyle,
  settingsShellNestedNavStyle,
  settingsShellParentNavStyle,
  settingsShellRootStyle,
  settingsShellSectionCardStyle,
  settingsShellSidebarSectionStyle,
  settingsShellSidebarSectionSpacingStyle,
  settingsShellSidebarStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type SettingsSectionID = 'general' | 'ai-apps' | 'ai-models' | 'ai-limits' | 'terminal' | 'commander'

const providerKindLabels: Record<AgentProviderView['kind'], string> = {
  ollama: 'Ollama',
  codex: 'Codex',
  openai: 'OpenAI-compatible',
  proxy: 'Legacy proxy',
}

function navButtonStateStyle(isActive: boolean) {
  return {
    ...settingsShellNavButtonStyle,
    background: isActive
      ? 'color-mix(in srgb, var(--color-surface-glass-strong) 72%, transparent)'
      : 'transparent',
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
  if (provider.kind === 'ollama') {
    return provider.ollama?.model?.trim() ?? ''
  }
  if (provider.kind === 'codex') {
    return provider.codex?.model?.trim() ?? ''
  }
  if (provider.kind === 'openai') {
    return provider.openai?.model?.trim() ?? ''
  }
  return ''
}

function directProviderChatModels(provider: AgentProviderView | null | undefined) {
  if (!provider) {
    return []
  }
  if (provider.kind === 'ollama') {
    return provider.ollama?.chat_models ?? []
  }
  if (provider.kind === 'codex') {
    return provider.codex?.chat_models ?? []
  }
  if (provider.kind === 'openai') {
    return provider.openai?.chat_models ?? []
  }
  return []
}

function describeProviderConnection(provider: AgentProviderView) {
  if (provider.kind === 'codex') {
    return provider.codex?.status_message ?? 'Local Codex auth state will be resolved by the backend.'
  }

  if (provider.kind === 'openai') {
    return provider.openai?.has_api_key ? 'Stored API key available.' : 'API key missing.'
  }

  if (provider.kind === 'ollama') {
    return provider.ollama?.base_url || 'No Ollama host configured.'
  }

  return `${provider.proxy?.channels.length ?? 0} channel(s) configured.`
}

function describeProviderLimitState(provider: AgentProviderView) {
  if (!provider.enabled) {
    return 'Disabled provider; chat will not route requests here.'
  }

  if (provider.active) {
    return 'Active provider for the current chat runtime.'
  }

  if (provider.kind === 'codex') {
    return provider.codex?.auth_state === 'ready'
      ? 'Connected through local Codex auth.'
      : 'Needs a valid local Codex login.'
  }

  if (provider.kind === 'openai') {
    return provider.openai?.has_api_key
      ? 'Ready, but request/token limits are not surfaced yet.'
      : 'Blocked until an API key is stored.'
  }

  if (provider.kind === 'ollama') {
    return 'Local runtime; no backend token/rate limit contract is exposed yet.'
  }

  return 'Legacy proxy records are editable, but provider limits are not surfaced yet.'
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
  return (
    <>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Основные</Text>
        <Text style={settingsShellMutedTextStyle}>
          Этот раздел теперь закреплён в общей структуре настроек, но глобальные runtime-параметры ещё не
          вынесены в отдельный backend contract.
        </Text>
      </ClearBox>
      <SectionCard
        description="Здесь будут жить shell-wide параметры, которые не относятся к AI, Terminal или Commander."
        title="Состояние раздела"
      >
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Общие настройки shell</Text>
              <Text style={settingsShellMutedTextStyle}>
                Пока структура добавлена для стабильной навигации и будущего разделения настроек.
              </Text>
            </ClearBox>
            <ClearBox style={settingsShellBadgeStyle}>Planned</ClearBox>
          </ClearBox>
        </ClearBox>
      </SectionCard>
    </>
  )
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

  const directProviders = useMemo(
    () => catalog?.providers.filter((provider) => provider.kind !== 'proxy') ?? [],
    [catalog],
  )

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
    selectedProvider && selectedProvider.kind !== 'proxy'
      ? selectedProvider
      : (directProviders.find((provider) => provider.id === selectedProviderID) ?? directProviders[0] ?? null)
  const configuredModel = directProviderDefaultModel(activeProvider)
  const selectedChatModels = directProviderChatModels(activeProvider)
  const visibleModels = useMemo(
    () => uniqueModelIDs([configuredModel, ...selectedChatModels, ...availableModels]),
    [availableModels, configuredModel, selectedChatModels],
  )

  return (
    <>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>AI / Модели</Text>
        <Text style={settingsShellMutedTextStyle}>
          Здесь виден список моделей, которые текущий chat runtime может использовать после активации
          конкретного провайдера.
        </Text>
      </ClearBox>

      <SectionCard
        description="Переключай провайдера, чтобы увидеть auto-discovered catalog, который доступен для выбора в чате."
        title="Доступные модели"
      >
        {isLoading ? (
          <Text style={settingsShellMutedTextStyle}>Загружаю каталог провайдеров…</Text>
        ) : directProviders.length === 0 ? (
          <Text style={settingsShellMutedTextStyle}>
            Прямых AI-провайдеров пока нет. Сначала добавь Ollama, Codex или OpenAI-compatible в разделе
            `Установленные приложения`.
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
              <ClearBox style={{ ...settingsShellSectionCardStyle, paddingBottom: 0, borderBottom: 'none' }}>
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
                                  ? uniqueModelIDs([...selectedChatModels, model])
                                  : selectedChatModels.filter((entry) => entry !== model)

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
    </>
  )
}

function AiLimitsSection() {
  const { catalog, isLoading } = useAgentProviderSettings()

  return (
    <>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>AI / Лимиты</Text>
        <Text style={settingsShellMutedTextStyle}>
          Раздел фиксирует текущее состояние провайдеров, но отдельный backend contract для token/rate limits
          ещё не введён.
        </Text>
      </ClearBox>

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
    </>
  )
}

function TerminalSection() {
  return (
    <>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Terminal</Text>
        <Text style={settingsShellMutedTextStyle}>
          Terminal gets its own stable section in the shell settings navigation instead of being mixed into AI
          or general settings.
        </Text>
      </ClearBox>
      <SectionCard
        description="Здесь будут жить terminal-specific preferences после выделения отдельного backend/frontend contract."
        title="Состояние раздела"
      >
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Terminal preferences</Text>
            <Text style={settingsShellMutedTextStyle}>
              Настройка терминала пока остаётся вне этого модального UI, но раздел уже закреплён в структуре.
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>Planned</ClearBox>
        </ClearBox>
      </SectionCard>
    </>
  )
}

function CommanderSection() {
  return (
    <>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Commander</Text>
        <Text style={settingsShellMutedTextStyle}>
          Commander настройки теперь тоже получают отдельную точку входа, а не теряются в общей свалке.
        </Text>
      </ClearBox>
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
    </>
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
    case 'ai-limits':
      return <AiLimitsSection />
    case 'terminal':
      return <TerminalSection />
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
              <Text style={{ fontWeight: 600 }}>Основные</Text>
              <Text style={settingsShellMutedTextStyle}>Shell-wide базовые параметры.</Text>
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
                  <Text style={{ fontWeight: 600 }}>Установленные приложения</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    Codex, Ollama и OpenAI-compatible providers.
                  </Text>
                </Button>
                <Button
                  aria-pressed={activeSectionID === 'ai-models'}
                  onClick={() => setActiveSectionID('ai-models')}
                  style={navButtonStateStyle(activeSectionID === 'ai-models')}
                >
                  <Text style={{ fontWeight: 600 }}>Модели</Text>
                  <Text style={settingsShellMutedTextStyle}>Список моделей, доступных в чате.</Text>
                </Button>
                <Button
                  aria-pressed={activeSectionID === 'ai-limits'}
                  onClick={() => setActiveSectionID('ai-limits')}
                  style={navButtonStateStyle(activeSectionID === 'ai-limits')}
                >
                  <Text style={{ fontWeight: 600 }}>Лимиты</Text>
                  <Text style={settingsShellMutedTextStyle}>Готовность и будущие quota surfaces.</Text>
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
              <Text style={{ fontWeight: 600 }}>Terminal</Text>
              <Text style={settingsShellMutedTextStyle}>Настройки терминального runtime.</Text>
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
              <Text style={{ fontWeight: 600 }}>Commander</Text>
              <Text style={settingsShellMutedTextStyle}>Настройки file-manager surface.</Text>
            </Button>
          </ClearBox>
        </ClearBox>

        <ClearBox runaComponent="settings-shell-content" style={settingsShellContentStyle}>
          <ScrollArea runaComponent="settings-shell-content-scroll" style={settingsShellContentScrollStyle}>
            {renderSection(activeSectionID)}
          </ScrollArea>
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
