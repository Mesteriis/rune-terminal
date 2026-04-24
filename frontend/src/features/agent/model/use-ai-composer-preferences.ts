import { useCallback, useSyncExternalStore } from 'react'

import type { AiComposerSubmitMode } from '@/features/agent/model/types'

const AI_COMPOSER_SUBMIT_MODE_STORAGE_KEY = 'rterm.ai.composer.submit-mode.v1'
const DEFAULT_AI_COMPOSER_SUBMIT_MODE: AiComposerSubmitMode = 'enter-sends'

const subscribers = new Set<() => void>()

function normalizeAiComposerSubmitMode(value: string | null | undefined): AiComposerSubmitMode {
  return value === 'mod-enter-sends' ? 'mod-enter-sends' : DEFAULT_AI_COMPOSER_SUBMIT_MODE
}

function emitAiComposerPreferenceChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function readAiComposerSubmitMode(): AiComposerSubmitMode {
  if (typeof window === 'undefined') {
    return DEFAULT_AI_COMPOSER_SUBMIT_MODE
  }

  try {
    return normalizeAiComposerSubmitMode(window.localStorage.getItem(AI_COMPOSER_SUBMIT_MODE_STORAGE_KEY))
  } catch {
    return DEFAULT_AI_COMPOSER_SUBMIT_MODE
  }
}

function subscribeToAiComposerPreferences(callback: () => void) {
  subscribers.add(callback)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AI_COMPOSER_SUBMIT_MODE_STORAGE_KEY) {
      callback()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
  }

  return () => {
    subscribers.delete(callback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage)
    }
  }
}

export function setAiComposerSubmitMode(mode: AiComposerSubmitMode) {
  const nextMode = normalizeAiComposerSubmitMode(mode)

  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(AI_COMPOSER_SUBMIT_MODE_STORAGE_KEY, nextMode)
  } catch {
    return
  }

  emitAiComposerPreferenceChange()
}

export function resetAiComposerPreferencesForTests() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AI_COMPOSER_SUBMIT_MODE_STORAGE_KEY)
  emitAiComposerPreferenceChange()
}

export function useAiComposerPreferences() {
  const submitMode = useSyncExternalStore(
    subscribeToAiComposerPreferences,
    readAiComposerSubmitMode,
    () => DEFAULT_AI_COMPOSER_SUBMIT_MODE,
  )

  const updateSubmitMode = useCallback((mode: AiComposerSubmitMode) => {
    setAiComposerSubmitMode(mode)
  }, [])

  return {
    submitMode,
    updateSubmitMode,
  }
}
