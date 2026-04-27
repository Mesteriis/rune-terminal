import type { AgentConversationProvider } from '@/features/agent/api/client'
import type { AgentProviderCatalog, AgentProviderView } from '@/features/agent/api/provider-client'
import type { AiProviderOption } from '@/features/agent/model/types'

export function directProviderChatModels(provider: AgentProviderView | null | undefined) {
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

export function directProviderDefaultModel(provider: AgentProviderView | null | undefined) {
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

export function providerOptionLabel(provider: AgentProviderView) {
  if (provider.display_name.trim()) {
    return provider.display_name.trim()
  }
  if (provider.kind === 'codex') {
    return 'Codex CLI'
  }
  if (provider.kind === 'claude') {
    return 'Claude Code CLI'
  }
  if (provider.kind === 'openai-compatible') {
    return 'OpenAI-Compatible HTTP'
  }
  return provider.id
}

export function providerOptionsFromCatalog(catalog: AgentProviderCatalog | null): AiProviderOption[] {
  if (!catalog) {
    return []
  }

  return catalog.providers
    .filter((provider) => provider.enabled)
    .map((provider) => ({
      value: provider.id,
      label: providerOptionLabel(provider),
    }))
}

export function providerViewToConversationProvider(
  provider: AgentProviderView | null | undefined,
  currentProvider: AgentConversationProvider | null,
): AgentConversationProvider | null {
  if (!provider) {
    return currentProvider
  }

  if (provider.kind === 'codex') {
    return {
      kind: provider.kind,
      base_url: provider.codex?.command ?? currentProvider?.base_url ?? '',
      model: provider.codex?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  if (provider.kind === 'claude') {
    return {
      kind: provider.kind,
      base_url: provider.claude?.command ?? currentProvider?.base_url ?? '',
      model: provider.claude?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  if (provider.kind === 'openai-compatible') {
    return {
      kind: provider.kind,
      base_url: provider.openai_compatible?.base_url ?? currentProvider?.base_url ?? '',
      model: provider.openai_compatible?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  return currentProvider
}

export function selectPreferredChatModel(
  currentModel: string,
  providerModel: string | undefined,
  availableModels: string[],
) {
  const selectedModel = currentModel.trim()
  if (selectedModel && availableModels.includes(selectedModel)) {
    return selectedModel
  }

  const activeProviderModel = providerModel?.trim() ?? ''
  if (activeProviderModel && availableModels.includes(activeProviderModel)) {
    return activeProviderModel
  }

  return availableModels[0] ?? ''
}
