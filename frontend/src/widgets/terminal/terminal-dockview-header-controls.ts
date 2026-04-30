import { useSyncExternalStore } from 'react'

import type { TerminalSearchResult } from '@/shared/ui/components/terminal-surface'

export type TerminalDockviewActionButtonConfig = {
  ariaLabel: string
  disabled: boolean
  label?: string
  title: string
  tone?: 'default' | 'accent'
  onClick: () => void
}

export type TerminalDockviewIconActionConfig = {
  ariaLabel: string
  disabled: boolean
  title: string
  onClick: () => void
}

export type TerminalDockviewToolbarControls = {
  isSearchOpen: boolean
  searchQuery: string
  searchResult: TerminalSearchResult | null
  onClear: () => void
  onCloseSearch: () => void
  onCopy: () => void
  onJumpToLatest: () => void
  onPaste: () => void
  onSearchNext: () => void
  onSearchPrevious: () => void
  onSearchQueryChange: (value: string) => void
  onToggleSearch: () => void
}

export type TerminalDockviewHeaderControls = {
  explain: TerminalDockviewActionButtonConfig
  interrupt: TerminalDockviewIconActionConfig
  recover: TerminalDockviewActionButtonConfig | null
  restart: TerminalDockviewIconActionConfig
  toolbar: TerminalDockviewToolbarControls
}

const controllerStore = new Map<string, TerminalDockviewHeaderControls>()
const listeners = new Map<string, Set<() => void>>()

function emit(hostId: string) {
  listeners.get(hostId)?.forEach((listener) => listener())
}

export function setTerminalDockviewHeaderControls(hostId: string, controls: TerminalDockviewHeaderControls) {
  controllerStore.set(hostId, controls)
  emit(hostId)
}

export function clearTerminalDockviewHeaderControls(hostId: string) {
  if (!controllerStore.delete(hostId)) {
    return
  }

  emit(hostId)
}

function subscribe(hostId: string, listener: () => void) {
  const hostListeners = listeners.get(hostId) ?? new Set<() => void>()
  hostListeners.add(listener)
  listeners.set(hostId, hostListeners)

  return () => {
    const currentListeners = listeners.get(hostId)

    if (!currentListeners) {
      return
    }

    currentListeners.delete(listener)

    if (currentListeners.size === 0) {
      listeners.delete(hostId)
    }
  }
}

function getSnapshot(hostId: string) {
  return controllerStore.get(hostId) ?? null
}

export function useTerminalDockviewHeaderControls(hostId: string) {
  return useSyncExternalStore(
    (listener) => subscribe(hostId, listener),
    () => getSnapshot(hostId),
    () => getSnapshot(hostId),
  )
}
