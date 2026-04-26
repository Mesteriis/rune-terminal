import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createAgentProvider,
  deleteAgentProvider,
  discoverAgentProviderModels,
  fetchAgentProviderCatalog,
  fetchAgentProviderGatewaySnapshot,
  probeAgentProvider,
  setActiveAgentProvider,
  updateAgentProvider,
  type AgentProviderCatalog,
  type AgentProviderProbeResult,
  type AgentProviderGatewaySnapshot,
  type AgentProviderKind,
  type AgentProviderView,
} from '@/features/agent/api/provider-client'
import {
  buildCreateProviderPayload,
  buildUpdateProviderPayload,
  createEmptyProviderDraft,
  createProviderDraftFromView,
  type AgentProviderDraft,
} from '@/features/agent/model/provider-settings-draft'

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Unable to update provider settings.'
}

function getPreferredProvider(catalog: AgentProviderCatalog, preferredID?: string | null) {
  if (preferredID) {
    const byPreferredID = catalog.providers.find((provider) => provider.id === preferredID)

    if (byPreferredID) {
      return byPreferredID
    }
  }

  const activeProvider = catalog.providers.find((provider) => provider.id === catalog.active_provider_id)

  if (activeProvider) {
    return activeProvider
  }

  return catalog.providers[0] ?? null
}

function getDraftModelValue(draft: AgentProviderDraft | null) {
  if (!draft) {
    return ''
  }
  if (draft.kind === 'codex') {
    return draft.codex.model
  }
  if (draft.kind === 'claude') {
    return draft.claude.model
  }
  if (draft.kind === 'openai-compatible') {
    return draft.openAICompatible.model
  }
  return ''
}

function uniqueModels(models: string[]) {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const rawModel of models) {
    const model = rawModel.trim()
    if (!model || seen.has(model)) {
      continue
    }
    seen.add(model)
    deduped.push(model)
  }

  return deduped
}

function buildChatModelsUpdatePayload(provider: AgentProviderView, chatModels: string[]) {
  switch (provider.kind) {
    case 'codex':
      return {
        codex: {
          chat_models: chatModels,
        },
      }
    case 'claude':
      return {
        claude: {
          chat_models: chatModels,
        },
      }
    case 'openai-compatible':
      return {
        openai_compatible: {
          chat_models: chatModels,
        },
      }
    default:
      throw new Error(
        `Provider kind ${provider.kind satisfies never} does not support chat model availability.`,
      )
  }
}

export function useAgentProviderSettings() {
  const [catalog, setCatalog] = useState<AgentProviderCatalog | null>(null)
  const [gateway, setGateway] = useState<AgentProviderGatewaySnapshot | null>(null)
  const [gatewayErrorMessage, setGatewayErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<AgentProviderDraft | null>(null)
  const [selectedProviderID, setSelectedProviderID] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<AgentProviderProbeResult | null>(null)
  const [probeErrorMessage, setProbeErrorMessage] = useState<string | null>(null)
  const [isProbing, setIsProbing] = useState(false)

  const reloadGateway = useCallback(async () => {
    try {
      const nextGateway = await fetchAgentProviderGatewaySnapshot()
      setGateway(nextGateway)
      setGatewayErrorMessage(null)
    } catch (error: unknown) {
      setGateway(null)
      setGatewayErrorMessage(getErrorMessage(error))
    }
  }, [])

  const selectProviderFromCatalog = useCallback(
    (nextCatalog: AgentProviderCatalog, providerID?: string | null) => {
      const provider = getPreferredProvider(nextCatalog, providerID)

      setCatalog(nextCatalog)
      setSelectedProviderID(provider?.id ?? null)
      setDraft(provider ? createProviderDraftFromView(provider) : null)
      setProbeResult(null)
      setProbeErrorMessage(null)
    },
    [],
  )

  const reloadCatalog = useCallback(
    async (preferredProviderID?: string | null) => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextCatalog = await fetchAgentProviderCatalog()
        selectProviderFromCatalog(nextCatalog, preferredProviderID)
        await reloadGateway()
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [reloadGateway, selectProviderFromCatalog],
  )

  useEffect(() => {
    void reloadCatalog()
  }, [reloadCatalog])

  const selectedProvider = useMemo(() => {
    if (!catalog || !selectedProviderID) {
      return null
    }

    return catalog.providers.find((provider) => provider.id === selectedProviderID) ?? null
  }, [catalog, selectedProviderID])

  const refreshAvailableModels = useCallback(
    async (draftOverride?: AgentProviderDraft | null) => {
      const nextDraft = draftOverride ?? draft
      const currentModel = getDraftModelValue(nextDraft)

      if (!nextDraft) {
        setAvailableModels(currentModel ? [currentModel] : [])
        setModelErrorMessage(null)
        setIsLoadingModels(false)
        return
      }

      setIsLoadingModels(true)
      setModelErrorMessage(null)

      try {
        const payload =
          nextDraft.kind === 'codex'
            ? nextDraft.mode === 'existing' && nextDraft.id
              ? {
                  provider_id: nextDraft.id,
                  codex: {
                    command: nextDraft.codex.command || undefined,
                    model: nextDraft.codex.model || undefined,
                  },
                }
              : {
                  kind: 'codex' as const,
                  codex: {
                    command: nextDraft.codex.command || undefined,
                    model: nextDraft.codex.model || undefined,
                  },
                }
            : nextDraft.kind === 'claude'
              ? nextDraft.mode === 'existing' && nextDraft.id
                ? {
                    provider_id: nextDraft.id,
                    claude: {
                      command: nextDraft.claude.command || undefined,
                      model: nextDraft.claude.model || undefined,
                    },
                  }
                : {
                    kind: 'claude' as const,
                    claude: {
                      command: nextDraft.claude.command || undefined,
                      model: nextDraft.claude.model || undefined,
                    },
                  }
              : nextDraft.mode === 'existing' && nextDraft.id
                ? {
                    provider_id: nextDraft.id,
                    openai_compatible: {
                      base_url: nextDraft.openAICompatible.baseURL || undefined,
                      model: nextDraft.openAICompatible.model || undefined,
                    },
                  }
                : {
                    kind: 'openai-compatible' as const,
                    openai_compatible: {
                      base_url: nextDraft.openAICompatible.baseURL || undefined,
                      model: nextDraft.openAICompatible.model || undefined,
                    },
                  }

        const response = await discoverAgentProviderModels(payload)
        const nextModels = uniqueModels([...(response.models ?? []), currentModel])
        setAvailableModels(nextModels)
        if (!currentModel && nextModels[0]) {
          setDraft((currentDraft) => {
            if (!currentDraft || currentDraft.kind !== nextDraft.kind) {
              return currentDraft
            }

            if (currentDraft.kind === 'codex') {
              return {
                ...currentDraft,
                codex: {
                  ...currentDraft.codex,
                  model: nextModels[0],
                },
              }
            }

            if (currentDraft.kind === 'claude') {
              return {
                ...currentDraft,
                claude: {
                  ...currentDraft.claude,
                  model: nextModels[0],
                },
              }
            }

            if (currentDraft.kind === 'openai-compatible') {
              return {
                ...currentDraft,
                openAICompatible: {
                  ...currentDraft.openAICompatible,
                  model: nextModels[0],
                },
              }
            }

            return currentDraft
          })
        }
      } catch (error: unknown) {
        setAvailableModels(currentModel ? [currentModel] : [])
        setModelErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoadingModels(false)
      }
    },
    [draft],
  )

  useEffect(() => {
    if (!draft) {
      setAvailableModels([])
      setIsLoadingModels(false)
      setModelErrorMessage(null)
      return
    }

    const timeoutID = window.setTimeout(() => {
      void refreshAvailableModels(draft)
    }, 250)
    return () => window.clearTimeout(timeoutID)
  }, [
    draft?.id,
    draft?.kind,
    draft?.mode,
    draft?.codex.command,
    draft?.codex.model,
    draft?.claude.command,
    draft?.claude.model,
    draft?.openAICompatible.baseURL,
    draft?.openAICompatible.model,
    refreshAvailableModels,
  ])

  const selectProvider = useCallback(
    (providerID: string) => {
      if (!catalog) {
        return
      }

      const provider = catalog.providers.find((candidate) => candidate.id === providerID)

      if (!provider) {
        return
      }

      setSelectedProviderID(provider.id)
      setDraft(createProviderDraftFromView(provider))
      setErrorMessage(null)
      setStatusMessage(null)
      setProbeResult(null)
      setProbeErrorMessage(null)
    },
    [catalog],
  )

  const startCreateProvider = useCallback((kind: AgentProviderKind) => {
    setSelectedProviderID(null)
    setDraft(createEmptyProviderDraft(kind))
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)
    setProbeErrorMessage(null)
  }, [])

  const resetDraft = useCallback(() => {
    if (!draft) {
      return
    }

    if (draft.mode === 'new') {
      setDraft(createEmptyProviderDraft(draft.kind))
      setErrorMessage(null)
      setStatusMessage(null)
      setProbeResult(null)
      setProbeErrorMessage(null)
      return
    }

    if (!catalog) {
      return
    }

    const provider = catalog.providers.find((candidate) => candidate.id === draft.id)

    if (!provider) {
      return
    }

    setDraft(createProviderDraftFromView(provider))
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)
    setProbeErrorMessage(null)
  }, [catalog, draft])

  const saveDraft = useCallback(async () => {
    if (!draft) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      if (draft.mode === 'new') {
        const response = await createAgentProvider(buildCreateProviderPayload(draft))
        selectProviderFromCatalog(response.providers, response.provider.id)
        await reloadGateway()
        setStatusMessage(`Created ${response.provider.display_name || response.provider.kind} provider.`)
      } else {
        const response = await updateAgentProvider(draft.id ?? '', buildUpdateProviderPayload(draft))
        selectProviderFromCatalog(response.providers, response.provider.id)
        await reloadGateway()
        setStatusMessage(`Saved ${response.provider.display_name || response.provider.kind} provider.`)
      }
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [draft, reloadGateway, selectProviderFromCatalog])

  const activateSelectedProvider = useCallback(async () => {
    if (!selectedProviderID) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const nextCatalog = await setActiveAgentProvider(selectedProviderID)
      selectProviderFromCatalog(nextCatalog, selectedProviderID)
      await reloadGateway()
      const provider = nextCatalog.providers.find((candidate) => candidate.id === selectedProviderID)
      setStatusMessage(`Activated ${provider?.display_name || provider?.kind || 'provider'}.`)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [reloadGateway, selectProviderFromCatalog, selectedProviderID])

  const removeSelectedProvider = useCallback(async () => {
    if (!draft || draft.mode !== 'existing' || !draft.id) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const nextCatalog = await deleteAgentProvider(draft.id)
      const nextProvider = getPreferredProvider(nextCatalog)

      selectProviderFromCatalog(nextCatalog, nextProvider?.id ?? null)
      await reloadGateway()
      setStatusMessage(`Deleted ${draft.displayName || draft.kind} provider.`)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [draft, reloadGateway, selectProviderFromCatalog])

  const updateProviderChatModels = useCallback(
    async (provider: AgentProviderView, chatModels: string[]) => {
      setIsSaving(true)
      setErrorMessage(null)
      setStatusMessage(null)

      try {
        const response = await updateAgentProvider(
          provider.id,
          buildChatModelsUpdatePayload(provider, uniqueModels(chatModels)),
        )
        selectProviderFromCatalog(response.providers, response.provider.id)
        await reloadGateway()
        setStatusMessage(
          `Updated chat model availability for ${response.provider.display_name || response.provider.kind}.`,
        )
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsSaving(false)
      }
    },
    [reloadGateway, selectProviderFromCatalog],
  )

  const probeSelectedProvider = useCallback(async () => {
    if (!selectedProviderID) {
      return
    }

    setIsProbing(true)
    setProbeErrorMessage(null)
    setProbeResult(null)

    try {
      const result = await probeAgentProvider(selectedProviderID)
      setProbeResult(result)
      setStatusMessage(`Probed ${result.display_name || result.provider_kind} provider.`)
    } catch (error: unknown) {
      setProbeErrorMessage(getErrorMessage(error))
    } finally {
      setIsProbing(false)
    }
  }, [selectedProviderID])

  return {
    availableModels,
    catalog,
    draft,
    errorMessage,
    gateway,
    gatewayErrorMessage,
    isLoading,
    isLoadingModels,
    isProbing,
    isSaving,
    modelErrorMessage,
    probeErrorMessage,
    probeResult,
    selectedProvider,
    selectedProviderID,
    setDraft,
    statusMessage,
    activateSelectedProvider,
    refreshAvailableModels,
    probeSelectedProvider,
    reloadCatalog,
    removeSelectedProvider,
    resetDraft,
    saveDraft,
    selectProvider,
    startCreateProvider,
    updateProviderChatModels,
  }
}

export type UseAgentProviderSettingsResult = ReturnType<typeof useAgentProviderSettings>
