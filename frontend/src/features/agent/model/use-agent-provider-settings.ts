import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createAgentProvider,
  deleteAgentProvider,
  discoverAgentProviderModels,
  fetchAgentProviderCatalog,
  setActiveAgentProvider,
  updateAgentProvider,
  type AgentProviderCatalog,
  type AgentProviderKind,
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
  if (draft.kind === 'ollama') {
    return draft.ollama.model
  }
  if (draft.kind === 'codex') {
    return draft.codex.model
  }
  if (draft.kind === 'openai') {
    return draft.openai.model
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

export function useAgentProviderSettings() {
  const [catalog, setCatalog] = useState<AgentProviderCatalog | null>(null)
  const [draft, setDraft] = useState<AgentProviderDraft | null>(null)
  const [selectedProviderID, setSelectedProviderID] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(null)

  const selectProviderFromCatalog = useCallback(
    (nextCatalog: AgentProviderCatalog, providerID?: string | null) => {
      const provider = getPreferredProvider(nextCatalog, providerID)

      setCatalog(nextCatalog)
      setSelectedProviderID(provider?.id ?? null)
      setDraft(provider ? createProviderDraftFromView(provider) : null)
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
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [selectProviderFromCatalog],
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

      if (
        !nextDraft ||
        (nextDraft.kind !== 'ollama' && nextDraft.kind !== 'codex' && nextDraft.kind !== 'openai')
      ) {
        setAvailableModels(currentModel ? [currentModel] : [])
        setModelErrorMessage(null)
        setIsLoadingModels(false)
        return
      }

      if (
        nextDraft.kind === 'openai' &&
        !nextDraft.openai.hasStoredAPIKey &&
        nextDraft.openai.apiKey.trim().length === 0
      ) {
        setAvailableModels(currentModel ? [currentModel] : [])
        setModelErrorMessage(
          nextDraft.mode === 'new'
            ? 'Enter an API key, then refresh to load available models.'
            : 'Store or paste an API key, then refresh to load available models.',
        )
        setIsLoadingModels(false)
        return
      }

      setIsLoadingModels(true)
      setModelErrorMessage(null)

      try {
        const payload =
          nextDraft.kind === 'ollama'
            ? nextDraft.mode === 'existing' && nextDraft.id
              ? {
                  provider_id: nextDraft.id,
                  ollama: {
                    base_url: nextDraft.ollama.baseURL || undefined,
                  },
                }
              : {
                  kind: 'ollama' as const,
                  ollama: {
                    base_url: nextDraft.ollama.baseURL || undefined,
                  },
                }
            : nextDraft.kind === 'codex'
              ? nextDraft.mode === 'existing' && nextDraft.id
                ? {
                    provider_id: nextDraft.id,
                    codex: {
                      auth_file_path: nextDraft.codex.authFilePath || undefined,
                    },
                  }
                : {
                    kind: 'codex' as const,
                    codex: {
                      auth_file_path: nextDraft.codex.authFilePath || undefined,
                    },
                  }
              : nextDraft.mode === 'existing' && nextDraft.id
                ? {
                    provider_id: nextDraft.id,
                    openai: {
                      base_url: nextDraft.openai.baseURL || undefined,
                      api_key: nextDraft.openai.apiKey.trim() || undefined,
                    },
                  }
                : {
                    kind: 'openai' as const,
                    openai: {
                      base_url: nextDraft.openai.baseURL || undefined,
                      api_key: nextDraft.openai.apiKey.trim() || undefined,
                    },
                  }

        const response = await discoverAgentProviderModels(payload)
        const nextModels = uniqueModels([...response.models, currentModel])
        setAvailableModels(nextModels)
        if (!currentModel && nextModels[0]) {
          setDraft((currentDraft) => {
            if (!currentDraft || currentDraft.kind !== nextDraft.kind) {
              return currentDraft
            }

            if (currentDraft.kind === 'ollama') {
              return {
                ...currentDraft,
                ollama: {
                  ...currentDraft.ollama,
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

    const currentModel = getDraftModelValue(draft)

    if (draft.kind === 'ollama') {
      const timeoutID = window.setTimeout(() => {
        void refreshAvailableModels(draft)
      }, 250)
      return () => window.clearTimeout(timeoutID)
    }

    if (draft.kind === 'codex') {
      const timeoutID = window.setTimeout(() => {
        void refreshAvailableModels(draft)
      }, 250)
      return () => window.clearTimeout(timeoutID)
    }

    if (draft.kind === 'openai') {
      if (draft.mode === 'existing' && draft.openai.hasStoredAPIKey) {
        const timeoutID = window.setTimeout(() => {
          void refreshAvailableModels(draft)
        }, 250)
        return () => window.clearTimeout(timeoutID)
      }

      if (draft.openai.apiKey.trim().length > 0) {
        const timeoutID = window.setTimeout(() => {
          void refreshAvailableModels(draft)
        }, 250)
        return () => window.clearTimeout(timeoutID)
      }

      setAvailableModels(currentModel ? [currentModel] : [])
      setIsLoadingModels(false)
      setModelErrorMessage(
        draft.mode === 'new'
          ? 'Enter an API key to auto-load available models.'
          : 'Store or paste an API key to auto-load available models.',
      )
      return
    }

    setAvailableModels([])
    setIsLoadingModels(false)
    setModelErrorMessage(null)
  }, [
    draft?.id,
    draft?.kind,
    draft?.mode,
    draft?.ollama.baseURL,
    draft?.codex.authFilePath,
    draft?.openai.apiKey,
    draft?.openai.baseURL,
    draft?.openai.hasStoredAPIKey,
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
    },
    [catalog],
  )

  const startCreateProvider = useCallback((kind: AgentProviderKind) => {
    setSelectedProviderID(null)
    setDraft(createEmptyProviderDraft(kind))
    setErrorMessage(null)
    setStatusMessage(null)
  }, [])

  const resetDraft = useCallback(() => {
    if (!draft) {
      return
    }

    if (draft.mode === 'new') {
      setDraft(createEmptyProviderDraft(draft.kind))
      setErrorMessage(null)
      setStatusMessage(null)
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
        setStatusMessage(`Created ${response.provider.display_name || response.provider.kind} provider.`)
      } else {
        const response = await updateAgentProvider(draft.id ?? '', buildUpdateProviderPayload(draft))
        selectProviderFromCatalog(response.providers, response.provider.id)
        setStatusMessage(`Saved ${response.provider.display_name || response.provider.kind} provider.`)
      }
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [draft, selectProviderFromCatalog])

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
      const provider = nextCatalog.providers.find((candidate) => candidate.id === selectedProviderID)
      setStatusMessage(`Activated ${provider?.display_name || provider?.kind || 'provider'}.`)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [selectProviderFromCatalog, selectedProviderID])

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
      setStatusMessage(`Deleted ${draft.displayName || draft.kind} provider.`)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [draft, selectProviderFromCatalog])

  return {
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
    reloadCatalog,
    removeSelectedProvider,
    resetDraft,
    saveDraft,
    selectProvider,
    startCreateProvider,
  }
}

export type UseAgentProviderSettingsResult = ReturnType<typeof useAgentProviderSettings>
