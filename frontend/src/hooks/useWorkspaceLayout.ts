import { useEffect, useMemo, useState } from 'react'

import { type ShellSection } from '../components/ShellSections'

const STORAGE_KEY = 'rterm.workspace.layout'

type LayoutState = {
  aiPanelVisible: boolean
  aiPanelSize: number
  section: ShellSection
}

const DEFAULT_STATE: LayoutState = {
  aiPanelVisible: true,
  aiPanelSize: 28,
  section: 'agent',
}

export function useWorkspaceLayout() {
  const [state, setState] = useState<LayoutState>(() => loadState())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return useMemo(
    () => ({
      aiPanelVisible: state.aiPanelVisible,
      aiPanelSize: state.aiPanelSize,
      section: state.section,
      toggleAIPanel() {
        setState((current) => ({ ...current, aiPanelVisible: !current.aiPanelVisible }))
      },
      selectSection(section: ShellSection) {
        setState((current) => ({ ...current, section, aiPanelVisible: true }))
      },
      rememberPanelSize(nextSize: number | undefined) {
        if (typeof nextSize !== 'number' || !Number.isFinite(nextSize) || nextSize <= 0) {
          return
        }
        setState((current) => ({
          ...current,
          aiPanelVisible: true,
          aiPanelSize: clampPanelSize(nextSize),
        }))
      },
    }),
    [state],
  )
}

function loadState(): LayoutState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_STATE
    }
    const parsed = JSON.parse(raw) as Partial<LayoutState>
    return {
      aiPanelVisible: typeof parsed.aiPanelVisible === 'boolean' ? parsed.aiPanelVisible : DEFAULT_STATE.aiPanelVisible,
      aiPanelSize: clampPanelSize(parsed.aiPanelSize),
      section: isShellSection(parsed.section) ? parsed.section : DEFAULT_STATE.section,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function clampPanelSize(value: unknown) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_STATE.aiPanelSize
  return Math.min(42, Math.max(20, numeric))
}

function isShellSection(value: unknown): value is ShellSection {
  return value === 'agent' || value === 'tools' || value === 'policy' || value === 'audit'
}
