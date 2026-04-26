import { useCallback, useEffect, useState } from 'react'

import {
  requestWindowTitleSettings,
  updateWindowTitleSettings,
  type WindowTitleMode,
  type WindowTitleSettings,
} from '@/shared/api/runtime'

const WINDOW_TITLE_SETTINGS_CHANGED_EVENT = 'rterm:window-title-settings-changed'

type WindowTitleSettingsState = {
  autoTitle: string
  customTitle: string
  errorMessage: string | null
  isLoading: boolean
  isSaving: boolean
  mode: WindowTitleMode
  refresh: () => Promise<void>
  updateSettings: (next: { customTitle?: string; mode?: WindowTitleMode }) => Promise<void>
}

function formatWindowTitleSettingsError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Unable to load window title settings.'
}

function normalizeViewState(payload: WindowTitleSettings) {
  return {
    autoTitle: payload.auto_title,
    customTitle: payload.settings.custom_title,
    mode: payload.settings.mode,
  }
}

function applyViewState(
  next: ReturnType<typeof normalizeViewState>,
  callbacks: {
    setAutoTitle: (value: string) => void
    setCustomTitle: (value: string) => void
    setMode: (value: WindowTitleMode) => void
  },
) {
  callbacks.setAutoTitle(next.autoTitle)
  callbacks.setCustomTitle(next.customTitle)
  callbacks.setMode(next.mode)
}

function emitWindowTitleSettingsChanged(next: ReturnType<typeof normalizeViewState>) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(WINDOW_TITLE_SETTINGS_CHANGED_EVENT, {
      detail: next,
    }),
  )
}

export function useWindowTitleSettings(): WindowTitleSettingsState {
  const [autoTitle, setAutoTitle] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [mode, setMode] = useState<WindowTitleMode>('auto')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const next = normalizeViewState(await requestWindowTitleSettings())
      applyViewState(next, { setAutoTitle, setCustomTitle, setMode })
      emitWindowTitleSettingsChanged(next)
    } catch (error) {
      setErrorMessage(formatWindowTitleSettingsError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<ReturnType<typeof normalizeViewState>>).detail
      if (!detail) {
        return
      }

      applyViewState(detail, { setAutoTitle, setCustomTitle, setMode })
    }

    window.addEventListener(WINDOW_TITLE_SETTINGS_CHANGED_EVENT, handleSettingsChanged)
    return () => {
      window.removeEventListener(WINDOW_TITLE_SETTINGS_CHANGED_EVENT, handleSettingsChanged)
    }
  }, [])

  const updateSettings = useCallback(async (next: { customTitle?: string; mode?: WindowTitleMode }) => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = normalizeViewState(
        await updateWindowTitleSettings({
          custom_title: next.customTitle,
          mode: next.mode,
        }),
      )
      applyViewState(updated, { setAutoTitle, setCustomTitle, setMode })
      emitWindowTitleSettingsChanged(updated)
    } catch (error) {
      setErrorMessage(formatWindowTitleSettingsError(error))
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    autoTitle,
    customTitle,
    errorMessage,
    isLoading,
    isSaving,
    mode,
    refresh,
    updateSettings,
  }
}
