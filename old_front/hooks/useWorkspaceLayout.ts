import { useEffect, useMemo, useState } from 'react'

import { type PolicyView } from '../components/PolicyViews'
import { type ShellSection } from '../components/ShellSections'

const STORAGE_KEY = 'rterm.workspace.layout'

type LayoutState = {
  aiPanelVisible: boolean
  aiPanelWidth: number
  section: ShellSection
  policyView: PolicyView
}

const DEFAULT_STATE: LayoutState = {
  aiPanelVisible: true,
  aiPanelWidth: 300,
  section: 'agent',
  policyView: 'overview',
}

export function useWorkspaceLayout() {
  const [state, setState] = useState<LayoutState>(() => loadState())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return useMemo(
    () => ({
      aiPanelVisible: state.aiPanelVisible,
      aiPanelWidth: state.aiPanelWidth,
      section: state.section,
      policyView: state.policyView,
      toggleAIPanel() {
        setState((current) => ({ ...current, aiPanelVisible: !current.aiPanelVisible }))
      },
      selectSection(section: ShellSection, options?: { policyView?: PolicyView }) {
        setState((current) => ({
          ...current,
          section,
          policyView: options?.policyView ?? current.policyView,
          aiPanelVisible: true,
        }))
      },
      selectPolicyView(policyView: PolicyView) {
        setState((current) => ({
          ...current,
          section: 'policy',
          policyView,
          aiPanelVisible: true,
        }))
      },
      rememberPanelWidth(nextWidth: number | undefined) {
        if (typeof nextWidth !== 'number' || !Number.isFinite(nextWidth) || nextWidth <= 0) {
          return
        }
        setState((current) => ({
          ...current,
          aiPanelVisible: true,
          aiPanelWidth: clampPanelWidth(nextWidth),
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
      aiPanelWidth: clampPanelWidth(resolveInitialPanelWidth(parsed)),
      section: isShellSection(parsed.section) ? parsed.section : DEFAULT_STATE.section,
      policyView: isPolicyView(parsed.policyView) ? parsed.policyView : DEFAULT_STATE.policyView,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function resolveInitialPanelWidth(parsed: Partial<LayoutState> & { aiPanelSize?: unknown }) {
  if (typeof parsed.aiPanelWidth === 'number' && Number.isFinite(parsed.aiPanelWidth)) {
    return parsed.aiPanelWidth
  }

  if (typeof parsed.aiPanelSize === 'number' && Number.isFinite(parsed.aiPanelSize)) {
    const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth
    if (parsed.aiPanelSize <= 100) {
      return (viewportWidth * parsed.aiPanelSize) / 100
    }
    return parsed.aiPanelSize
  }

  return DEFAULT_STATE.aiPanelWidth
}

function clampPanelWidth(value: unknown) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_STATE.aiPanelWidth
  const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth
  const minWidth = 300
  const maxWidth = Math.floor(viewportWidth * 0.66)

  if (minWidth > maxWidth) {
    return minWidth
  }

  return Math.max(minWidth, Math.min(numeric, maxWidth))
}

function isShellSection(value: unknown): value is ShellSection {
  return value === 'agent' || value === 'launcher' || value === 'connections' || value === 'tools' || value === 'policy' || value === 'audit'
}

function isPolicyView(value: unknown): value is PolicyView {
  return value === 'overview' || value === 'trusted' || value === 'ignore' || value === 'help'
}
