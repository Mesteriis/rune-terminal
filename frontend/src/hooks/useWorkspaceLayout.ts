import { useEffect, useMemo, useState } from 'react'

import { type PolicyView } from '../components/PolicyViews'
import { type ShellSection } from '../components/ShellSections'

const STORAGE_KEY = 'rterm.workspace.layout'

type LayoutState = {
  aiPanelVisible: boolean
  aiPanelSize: number
  section: ShellSection
  policyView: PolicyView
}

const DEFAULT_STATE: LayoutState = {
  aiPanelVisible: true,
  aiPanelSize: 28,
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
      aiPanelSize: state.aiPanelSize,
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
      policyView: isPolicyView(parsed.policyView) ? parsed.policyView : DEFAULT_STATE.policyView,
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
  return value === 'agent' || value === 'launcher' || value === 'connections' || value === 'tools' || value === 'policy' || value === 'audit'
}

function isPolicyView(value: unknown): value is PolicyView {
  return value === 'overview' || value === 'trusted' || value === 'ignore' || value === 'help'
}
