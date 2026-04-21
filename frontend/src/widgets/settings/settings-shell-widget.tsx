import { type ReactNode, useEffect, useMemo, useState } from 'react'

import type { AgentProviderView } from '@/features/agent/api/provider-client'
import { useAgentProviderSettings } from '@/features/agent/model/use-agent-provider-settings'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, ScrollArea, Surface, Text } from '@/shared/ui/primitives'
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
  settingsShellRootStyle,
  settingsShellSectionCardStyle,
  settingsShellSidebarLabelStyle,
  settingsShellSidebarSectionStyle,
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
    borderColor: isActive ? 'var(--color-accent-emerald-strong)' : 'var(--color-border-subtle)',
    background: isActive ? 'var(--color-surface-glass-strong)' : 'var(--color-surface-glass-soft)',
  }
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
    <Surface style={settingsShellSectionCardStyle}>
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </Box>
      {children}
    </Surface>
  )
}

function GeneralSection() {
  return (
    <>
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Основные</Text>
        <Text style={settingsShellMutedTextStyle}>
          Этот раздел теперь закреплён в общей структуре настроек, но глобальные runtime-параметры ещё не
          вынесены в отдельный backend contract.
        </Text>
      </Box>
      <SectionCard
        description="Здесь будут жить shell-wide параметры, которые не относятся к AI, Terminal или Commander."
        title="Состояние раздела"
      >
        <Box style={settingsShellListStyle}>
          <Box style={settingsShellListRowStyle}>
            <Box style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Общие настройки shell</Text>
              <Text style={settingsShellMutedTextStyle}>
                Пока структура добавлена для стабильной навигации и будущего разделения настроек.
              </Text>
            </Box>
            <Box style={settingsShellBadgeStyle}>Planned</Box>
          </Box>
        </Box>
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
    modelErrorMessage,
    refreshAvailableModels,
    selectProvider,
    selectedProvider,
    selectedProviderID,
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

  return (
    <>
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>AI / Модели</Text>
        <Text style={settingsShellMutedTextStyle}>
          Здесь виден список моделей, которые текущий chat runtime может использовать после активации
          конкретного провайдера.
        </Text>
      </Box>

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
            <Box style={settingsShellCardsGridStyle}>
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
            </Box>

            {activeProvider ? (
              <Surface style={settingsShellSectionCardStyle}>
                <Box style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>
                    {activeProvider.display_name || providerKindLabels[activeProvider.kind]}
                  </Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {activeProvider.active
                      ? 'Сейчас активен в runtime.'
                      : 'Доступен для активации в provider catalog.'}
                  </Text>
                </Box>
                <Box style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                  <Button disabled={isLoadingModels} onClick={() => void refreshAvailableModels()}>
                    {isLoadingModels ? 'Loading…' : 'Refresh models'}
                  </Button>
                  <Box style={settingsShellBadgeStyle}>
                    {availableModels.length} model{availableModels.length === 1 ? '' : 's'}
                  </Box>
                </Box>
                {errorMessage ? (
                  <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
                ) : null}
                {modelErrorMessage ? (
                  <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{modelErrorMessage}</Text>
                ) : null}
                {!errorMessage && !modelErrorMessage && availableModels.length === 0 ? (
                  <Text style={settingsShellMutedTextStyle}>
                    Для этого провайдера backend пока не вернул модели.
                  </Text>
                ) : null}
                {availableModels.length > 0 ? (
                  <Box style={settingsShellListStyle}>
                    {availableModels.map((model) => (
                      <Box key={model} style={settingsShellListRowStyle}>
                        <Text style={{ fontWeight: 600 }}>{model}</Text>
                        <Box style={settingsShellBadgeStyle}>chat-ready</Box>
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Surface>
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
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>AI / Лимиты</Text>
        <Text style={settingsShellMutedTextStyle}>
          Раздел фиксирует текущее состояние провайдеров, но отдельный backend contract для token/rate limits
          ещё не введён.
        </Text>
      </Box>

      <SectionCard
        description="Сейчас здесь выводится только готовность каналов для чата. Реальные лимиты появятся после backend-owned quota surface."
        title="Статус провайдеров"
      >
        {isLoading ? (
          <Text style={settingsShellMutedTextStyle}>Загружаю provider catalog…</Text>
        ) : !catalog?.providers.length ? (
          <Text style={settingsShellMutedTextStyle}>Провайдеров пока нет.</Text>
        ) : (
          <Box style={settingsShellListStyle}>
            {catalog.providers.map((provider) => (
              <Box key={provider.id} style={settingsShellListRowStyle}>
                <Box style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>
                    {provider.display_name || providerKindLabels[provider.kind]}
                  </Text>
                  <Text style={settingsShellMutedTextStyle}>{describeProviderLimitState(provider)}</Text>
                </Box>
                <Box style={settingsShellBadgeStyle}>
                  {provider.active ? 'active' : provider.enabled ? 'ready' : 'disabled'}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </SectionCard>
    </>
  )
}

function TerminalSection() {
  return (
    <>
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Terminal</Text>
        <Text style={settingsShellMutedTextStyle}>
          Terminal gets its own stable section in the shell settings navigation instead of being mixed into AI
          or general settings.
        </Text>
      </Box>
      <SectionCard
        description="Здесь будут жить terminal-specific preferences после выделения отдельного backend/frontend contract."
        title="Состояние раздела"
      >
        <Box style={settingsShellListRowStyle}>
          <Box style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Terminal preferences</Text>
            <Text style={settingsShellMutedTextStyle}>
              Настройка терминала пока остаётся вне этого модального UI, но раздел уже закреплён в структуре.
            </Text>
          </Box>
          <Box style={settingsShellBadgeStyle}>Planned</Box>
        </Box>
      </SectionCard>
    </>
  )
}

function CommanderSection() {
  return (
    <>
      <Box style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Commander</Text>
        <Text style={settingsShellMutedTextStyle}>
          Commander настройки теперь тоже получают отдельную точку входа, а не теряются в общей свалке.
        </Text>
      </Box>
      <SectionCard
        description="Этот раздел подготовлен для commander-specific options, когда они будут выведены из widget-local state."
        title="Состояние раздела"
      >
        <Box style={settingsShellListRowStyle}>
          <Box style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Commander preferences</Text>
            <Text style={settingsShellMutedTextStyle}>
              Отдельный конфигурационный surface для commander ещё не подключён.
            </Text>
          </Box>
          <Box style={settingsShellBadgeStyle}>Planned</Box>
        </Box>
      </SectionCard>
    </>
  )
}

function renderSection(sectionID: SettingsSectionID) {
  switch (sectionID) {
    case 'general':
      return <GeneralSection />
    case 'ai-apps':
      return <AgentProviderSettingsWidget />
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

  return (
    <RunaDomScopeProvider component="settings-shell-widget">
      <Box runaComponent="settings-shell-root" style={settingsShellRootStyle}>
        <Surface runaComponent="settings-shell-sidebar" style={settingsShellSidebarStyle}>
          <Box style={settingsShellSidebarSectionStyle}>
            <Button
              aria-pressed={activeSectionID === 'general'}
              onClick={() => setActiveSectionID('general')}
              style={navButtonStateStyle(activeSectionID === 'general')}
            >
              <Text style={{ fontWeight: 600 }}>Основные</Text>
              <Text style={settingsShellMutedTextStyle}>Shell-wide базовые параметры.</Text>
            </Button>
          </Box>

          <Box style={settingsShellSidebarSectionStyle}>
            <Text style={settingsShellSidebarLabelStyle}>AI</Text>
            <Box style={settingsShellNestedNavStyle}>
              <Button
                aria-pressed={activeSectionID === 'ai-apps'}
                onClick={() => setActiveSectionID('ai-apps')}
                style={navButtonStateStyle(activeSectionID === 'ai-apps')}
              >
                <Text style={{ fontWeight: 600 }}>Установленные приложения</Text>
                <Text style={settingsShellMutedTextStyle}>Codex, Ollama и OpenAI-compatible providers.</Text>
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
            </Box>
          </Box>

          <Box style={settingsShellSidebarSectionStyle}>
            <Button
              aria-pressed={activeSectionID === 'terminal'}
              onClick={() => setActiveSectionID('terminal')}
              style={navButtonStateStyle(activeSectionID === 'terminal')}
            >
              <Text style={{ fontWeight: 600 }}>Terminal</Text>
              <Text style={settingsShellMutedTextStyle}>Настройки терминального runtime.</Text>
            </Button>
          </Box>

          <Box style={settingsShellSidebarSectionStyle}>
            <Button
              aria-pressed={activeSectionID === 'commander'}
              onClick={() => setActiveSectionID('commander')}
              style={navButtonStateStyle(activeSectionID === 'commander')}
            >
              <Text style={{ fontWeight: 600 }}>Commander</Text>
              <Text style={settingsShellMutedTextStyle}>Настройки file-manager surface.</Text>
            </Button>
          </Box>
        </Surface>

        <Box runaComponent="settings-shell-content" style={settingsShellContentStyle}>
          <ScrollArea runaComponent="settings-shell-content-scroll" style={settingsShellContentScrollStyle}>
            {renderSection(activeSectionID)}
          </ScrollArea>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
