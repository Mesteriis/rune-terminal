import { useCallback, useSyncExternalStore } from 'react'

import type { AiComposerSubmitMode } from '@/features/agent/model/types'
import {
  clampAgentComposerSubmitMode,
  DEFAULT_AGENT_COMPOSER_SUBMIT_MODE,
  requestAgentSettings,
  updateAgentSettings,
} from '@/shared/api/agent-settings'

const subscribers = new Set<() => void>()
let loadPromise: Promise<void> | null = null

type AiComposerPreferencesState = {
  submitMode: AiComposerSubmitMode
  debugModeEnabled: boolean
  isLoading: boolean
  isSaving: boolean
  errorMessage: string | null
}

let aiComposerPreferencesState: AiComposerPreferencesState = {
  submitMode: DEFAULT_AGENT_COMPOSER_SUBMIT_MODE,
  debugModeEnabled: false,
  isLoading: true,
  isSaving: false,
  errorMessage: null,
}

function normalizeAiComposerSubmitMode(value: string | null | undefined): AiComposerSubmitMode {
  return clampAgentComposerSubmitMode(value)
}

function emitAiComposerPreferenceChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function formatAiComposerPreferencesError(error: unknown) {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return 'Unable to load AI composer settings.'
}

async function refreshAiComposerPreferences() {
  aiComposerPreferencesState = {
    ...aiComposerPreferencesState,
    errorMessage: null,
    isLoading: true,
  }
  emitAiComposerPreferenceChange()

  try {
    const settings = await requestAgentSettings()
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      submitMode: settings.composer_submit_mode,
      debugModeEnabled: settings.debug_mode_enabled,
    }
  } catch (error) {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      errorMessage: formatAiComposerPreferencesError(error),
    }
  } finally {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      isLoading: false,
    }
    emitAiComposerPreferenceChange()
  }
}

function ensureAiComposerPreferencesLoaded() {
  if (!loadPromise) {
    loadPromise = refreshAiComposerPreferences().finally(() => {
      loadPromise = null
    })
  }

  return loadPromise
}

function subscribeToAiComposerPreferences(callback: () => void) {
  subscribers.add(callback)
  void ensureAiComposerPreferencesLoaded()

  return () => {
    subscribers.delete(callback)
  }
}

function getAiComposerPreferencesSnapshot() {
  return aiComposerPreferencesState
}

export async function setAiComposerSubmitMode(mode: AiComposerSubmitMode) {
  const nextMode = normalizeAiComposerSubmitMode(mode)

  try {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      errorMessage: null,
      isSaving: true,
    }
    emitAiComposerPreferenceChange()

    const settings = await updateAgentSettings({
      composer_submit_mode: nextMode,
      debug_mode_enabled: aiComposerPreferencesState.debugModeEnabled,
    })
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      submitMode: settings.composer_submit_mode,
      debugModeEnabled: settings.debug_mode_enabled,
    }
  } catch (error) {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      errorMessage: formatAiComposerPreferencesError(error),
    }
  } finally {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      isSaving: false,
    }
    emitAiComposerPreferenceChange()
  }
}

export async function setAiDebugModeEnabled(enabled: boolean) {
  try {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      errorMessage: null,
      isSaving: true,
    }
    emitAiComposerPreferenceChange()

    const settings = await updateAgentSettings({
      composer_submit_mode: aiComposerPreferencesState.submitMode,
      debug_mode_enabled: enabled,
    })
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      submitMode: settings.composer_submit_mode,
      debugModeEnabled: settings.debug_mode_enabled,
    }
  } catch (error) {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      errorMessage: formatAiComposerPreferencesError(error),
    }
  } finally {
    aiComposerPreferencesState = {
      ...aiComposerPreferencesState,
      isSaving: false,
    }
    emitAiComposerPreferenceChange()
  }
}

export function resetAiComposerPreferencesForTests() {
  loadPromise = null
  aiComposerPreferencesState = {
    submitMode: DEFAULT_AGENT_COMPOSER_SUBMIT_MODE,
    debugModeEnabled: false,
    isLoading: true,
    isSaving: false,
    errorMessage: null,
  }
  emitAiComposerPreferenceChange()
}

export function useAiComposerPreferences() {
  const state = useSyncExternalStore(
    subscribeToAiComposerPreferences,
    getAiComposerPreferencesSnapshot,
    () => aiComposerPreferencesState,
  )

  const updateSubmitMode = useCallback((mode: AiComposerSubmitMode) => {
    void setAiComposerSubmitMode(mode)
  }, [])

  const updateDebugModeEnabled = useCallback((enabled: boolean) => {
    void setAiDebugModeEnabled(enabled)
  }, [])

  return {
    submitMode: state.submitMode,
    debugModeEnabled: state.debugModeEnabled,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    errorMessage: state.errorMessage,
    updateSubmitMode,
    updateDebugModeEnabled,
  }
}
