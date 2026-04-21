import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createAgentProvider,
  deleteAgentProvider,
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

export function useAgentProviderSettings() {
  const [catalog, setCatalog] = useState<AgentProviderCatalog | null>(null)
  const [draft, setDraft] = useState<AgentProviderDraft | null>(null)
  const [selectedProviderID, setSelectedProviderID] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
    catalog,
    draft,
    errorMessage,
    isLoading,
    isSaving,
    selectedProvider,
    selectedProviderID,
    setDraft,
    statusMessage,
    activateSelectedProvider,
    reloadCatalog,
    removeSelectedProvider,
    resetDraft,
    saveDraft,
    selectProvider,
    startCreateProvider,
  }
}

export type UseAgentProviderSettingsResult = ReturnType<typeof useAgentProviderSettings>
