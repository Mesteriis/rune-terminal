import { useCallback, useEffect, useState } from 'react'

import {
  canUpdateRuntimeSettings,
  requestRuntimeSettings,
  resolveRuntimeContext,
  setRuntimeWatcherMode,
  type RuntimeContext,
  type RuntimeWatcherMode,
} from '@/shared/api/runtime'

type RuntimeSettingsState = {
  runtimeContext: RuntimeContext | null
  watcherMode: RuntimeWatcherMode
  isLoading: boolean
  isSaving: boolean
  errorMessage: string | null
  canPersistWatcherMode: boolean
  refresh: () => Promise<void>
  updateWatcherMode: (mode: RuntimeWatcherMode) => Promise<void>
}

function normalizeWatcherMode(mode: string | null | undefined): RuntimeWatcherMode {
  return mode === 'persistent' ? 'persistent' : 'ephemeral'
}

function formatRuntimeSettingsError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to load runtime settings.'
}

export function useRuntimeSettings(): RuntimeSettingsState {
  const [runtimeContext, setRuntimeContext] = useState<RuntimeContext | null>(null)
  const [watcherMode, setWatcherMode] = useState<RuntimeWatcherMode>('ephemeral')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const canPersistWatcherMode = canUpdateRuntimeSettings()

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [nextContext, nextSettings] = await Promise.all([
        resolveRuntimeContext(),
        requestRuntimeSettings(),
      ])

      setRuntimeContext(nextContext)
      setWatcherMode(normalizeWatcherMode(nextSettings.watcher_mode))
    } catch (error) {
      setErrorMessage(formatRuntimeSettingsError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateWatcherMode = useCallback(
    async (mode: RuntimeWatcherMode) => {
      if (mode === watcherMode || !canPersistWatcherMode) {
        return
      }

      setIsSaving(true)
      setErrorMessage(null)

      try {
        await setRuntimeWatcherMode(mode)
        const nextSettings = await requestRuntimeSettings()
        setWatcherMode(normalizeWatcherMode(nextSettings.watcher_mode))
      } catch (error) {
        setErrorMessage(formatRuntimeSettingsError(error))
      } finally {
        setIsSaving(false)
      }
    },
    [canPersistWatcherMode, watcherMode],
  )

  return {
    runtimeContext,
    watcherMode,
    isLoading,
    isSaving,
    errorMessage,
    canPersistWatcherMode,
    refresh,
    updateWatcherMode,
  }
}
