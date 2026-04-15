import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Group,
  Panel,
  Separator,
  type GroupImperativeHandle,
  type Layout as PanelLayout,
  type PanelImperativeHandle,
} from 'react-resizable-panels'

import './App.css'

import { AgentSidebar } from './components/AgentSidebar'
import { PolicyPanel } from './components/PolicyPanel'
import { TerminalSurface } from './components/TerminalSurface'
import { WidgetDock } from './components/WidgetDock'
import { WorkspaceRail } from './components/WorkspaceRail'
import { useRuntimeShell } from './hooks/useRuntimeShell'
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout'
import type { PolicyView } from './components/PolicyViews'
import type { ShellSection } from './components/ShellSections'

type OverlayGeometry = {
  left: number
  top: number
  width: number
  height: number
}

const AI_PANEL_MIN_WIDTH = 300
const AI_PANEL_DEFAULT_WIDTH = 300
const AI_PANEL_MAX_WIDTH_RATIO = 0.66

function clampAiPanelWidth(width: number, containerWidth: number) {
  const maxWidth = Math.floor(containerWidth * AI_PANEL_MAX_WIDTH_RATIO)
  if (AI_PANEL_MIN_WIDTH > maxWidth) {
    return AI_PANEL_MIN_WIDTH
  }
  return Math.max(AI_PANEL_MIN_WIDTH, Math.min(width, maxWidth))
}

function App() {
  const shell = useRuntimeShell()
  const layout = useWorkspaceLayout()
  const [policyOverlayView, setPolicyOverlayView] = useState<PolicyView | null>(null)
  const [policyOverlayRevision, setPolicyOverlayRevision] = useState(0)
  const workspaceShellRef = useRef<HTMLElement>(null)
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null)
  const aiPanelRef = useRef<PanelImperativeHandle | null>(null)
  const syncingPanelLayoutRef = useRef(false)
  const [policyOverlayGeometry, setPolicyOverlayGeometry] = useState<OverlayGeometry>(() => ({
    left: 0,
    top: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  const getCurrentAiPanelWidth = useCallback(
    (fallbackWidth?: number) => {
      if (!layout.aiPanelVisible) {
        return 0
      }

      const liveWidth = aiPanelRef.current?.getSize().inPixels
      if (typeof liveWidth === 'number' && Number.isFinite(liveWidth) && liveWidth > 0) {
        return liveWidth
      }

      const shellWidth = workspaceShellRef.current?.getBoundingClientRect().width ?? window.innerWidth
      return clampAiPanelWidth(fallbackWidth ?? layout.aiPanelWidth ?? AI_PANEL_DEFAULT_WIDTH, shellWidth)
    },
    [layout.aiPanelVisible, layout.aiPanelWidth],
  )

  const updatePolicyOverlayGeometry = useCallback((nextAiPanelWidth?: number) => {
    const shellElement = workspaceShellRef.current
    if (!shellElement) {
      return
    }

    const shellRect = shellElement.getBoundingClientRect()
    const aiPanelWidth = layout.aiPanelVisible
      ? clampAiPanelWidth(nextAiPanelWidth ?? getCurrentAiPanelWidth(), shellRect.width)
      : 0

    setPolicyOverlayGeometry({
      left: shellRect.left + aiPanelWidth,
      top: shellRect.top,
      width: Math.max(0, shellRect.width - aiPanelWidth),
      height: Math.max(0, shellRect.height),
    })
    setPolicyOverlayRevision((current) => current + 1)
  }, [getCurrentAiPanelWidth, layout.aiPanelVisible])

  const syncPanelLayout = useCallback(
    (nextAiPanelWidth?: number) => {
      const shellElement = workspaceShellRef.current
      const group = panelGroupRef.current
      const aiPanel = aiPanelRef.current
      if (!shellElement || !group || !aiPanel) {
        return
      }

      const shellWidth = shellElement.getBoundingClientRect().width
      if (!Number.isFinite(shellWidth) || shellWidth <= 0) {
        return
      }

      const aiWidth = layout.aiPanelVisible
        ? clampAiPanelWidth(nextAiPanelWidth ?? layout.aiPanelWidth ?? AI_PANEL_DEFAULT_WIDTH, shellWidth)
        : 0
      const aiPercent = layout.aiPanelVisible ? (aiWidth / shellWidth) * 100 : 0

      syncingPanelLayoutRef.current = true
      if (layout.aiPanelVisible) {
        aiPanel.expand()
      } else {
        aiPanel.collapse()
      }
      group.setLayout({
        'ai-panel': aiPercent,
        'main-panel': 100 - aiPercent,
      })
      syncingPanelLayoutRef.current = false

      updatePolicyOverlayGeometry(aiWidth)
    },
    [layout.aiPanelVisible, layout.aiPanelWidth, updatePolicyOverlayGeometry],
  )

  const handlePolicyOverlayWindowResize = useCallback(() => {
    updatePolicyOverlayGeometry()
  }, [updatePolicyOverlayGeometry])

  useEffect(() => {
    syncPanelLayout()
  }, [syncPanelLayout])

  useEffect(() => {
    const handleWindowResize = () => {
      syncPanelLayout()
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [syncPanelLayout])

  useEffect(() => {
    if (!policyOverlayView) {
      return
    }

    const shellElement = workspaceShellRef.current
    if (!shellElement) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      updatePolicyOverlayGeometry()
    })
    resizeObserver.observe(shellElement)
    window.addEventListener('resize', handlePolicyOverlayWindowResize)
    updatePolicyOverlayGeometry()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handlePolicyOverlayWindowResize)
    }
  }, [handlePolicyOverlayWindowResize, policyOverlayView, updatePolicyOverlayGeometry])

  useEffect(() => {
    if (!policyOverlayView) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPolicyOverlayView(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [policyOverlayView])

  const openPolicyOverlay = useCallback(
    (view: PolicyView) => {
      setPolicyOverlayView(view)
      updatePolicyOverlayGeometry()
    },
    [updatePolicyOverlayGeometry],
  )

  const closePolicyOverlay = useCallback(() => {
    setPolicyOverlayView(null)
  }, [])

  const handleSelectSection = useCallback(
    (section: ShellSection, options?: { policyView?: PolicyView }) => {
      if (section === 'policy') {
        openPolicyOverlay(options?.policyView ?? layout.policyView)
        return
      }
      layout.selectSection(section)
    },
    [layout, openPolicyOverlay],
  )

  const policyOverlayStyle = policyOverlayView
    ? {
        left: `${policyOverlayGeometry.left}px`,
        top: `${policyOverlayGeometry.top}px`,
        width: `${policyOverlayGeometry.width}px`,
        height: `${policyOverlayGeometry.height}px`,
      }
    : undefined

  const policyOverlay = policyOverlayView ? createPortal(
    typeof document === 'undefined'
      ? null
      : (
          <section
            className="workspace-settings-overlay"
            style={policyOverlayStyle}
            key={`${policyOverlayView}:${policyOverlayRevision}`}
            onClick={closePolicyOverlay}
          >
            <button
              type="button"
              className="workspace-settings-overlay-backdrop"
              aria-label="Close settings and help"
              onClick={closePolicyOverlay}
            />
            <section
              className="workspace-settings-overlay-surface"
              onClick={(event) => event.stopPropagation()}
            >
              <PolicyPanel
                trustedRules={shell.trustedRules}
                ignoreRules={shell.ignoreRules}
                view={policyOverlayView}
                onSelectView={openPolicyOverlay}
                onSelectSection={(section) => {
                  if (section === 'policy') {
                    return
                  }
                  closePolicyOverlay()
                  layout.selectSection(section)
                }}
                onAddTrustedRule={shell.addTrustedRule}
                onRemoveTrustedRule={shell.removeTrustedRule}
                onAddIgnoreRule={shell.addIgnoreRule}
                onRemoveIgnoreRule={shell.removeIgnoreRule}
              />
            </section>
          </section>
        ),
    document.body,
  ) : null

  if (shell.runtimeError) {
    return (
      <main className="shell error-shell">
        <section className="error-panel">
          <p className="eyebrow">Runtime bootstrap failed</p>
          <h1>RunaTerminal cannot discover the Go core.</h1>
          <pre>{shell.runtimeError}</pre>
          <ul className="error-hints">
            <li>Run `npm run build:core` to refresh `apps/desktop/bin/rterm-core`.</li>
            <li>Run `npm run tauri:dev` (not `cargo tauri dev`) for the supported launch path.</li>
            <li>If dependencies changed, run `npm install` and `npm --prefix frontend install`.</li>
          </ul>
        </section>
      </main>
    )
  }

  return (
    <main className="shell">
      <WorkspaceRail
        workspace={shell.workspace}
        repoRoot={shell.repoRoot}
        activeConnectionName={shell.activeConnection?.name ?? 'Local Machine'}
        activeTabId={shell.workspace?.active_tab_id}
        aiPanelVisible={layout.aiPanelVisible}
        onToggleAIPanel={layout.toggleAIPanel}
        onOpenConnections={() => handleSelectSection('connections')}
        onFocusTab={shell.focusTab}
        onCreateTab={() => shell.createTerminalTab()}
        onCloseTab={shell.closeTab}
        onMoveTab={shell.moveTab}
        onRenameTab={shell.renameTab}
        onToggleTabPinned={shell.setTabPinned}
      />

      <section className="workspace-shell" ref={workspaceShellRef}>
        <Group
          groupRef={panelGroupRef}
          orientation="horizontal"
          className="workspace-panel-group"
          resizeTargetMinimumSize={{ coarse: 28, fine: 14 }}
          onLayoutChange={(nextLayout: PanelLayout) => {
            if (!layout.aiPanelVisible || syncingPanelLayoutRef.current) {
              return
            }
            const shellWidth = workspaceShellRef.current?.getBoundingClientRect().width
            const aiPanelPercent = nextLayout['ai-panel']
            if (
              typeof shellWidth === 'number' &&
              shellWidth > 0 &&
              typeof aiPanelPercent === 'number' &&
              aiPanelPercent >= 0 &&
              aiPanelPercent <= 100
            ) {
              updatePolicyOverlayGeometry((shellWidth * aiPanelPercent) / 100)
            }
          }}
          onLayoutChanged={(nextLayout: PanelLayout) => {
            if (!layout.aiPanelVisible || syncingPanelLayoutRef.current) {
              return
            }
            const shellWidth = workspaceShellRef.current?.getBoundingClientRect().width
            const aiPanelPercent = nextLayout['ai-panel']
            if (
              typeof shellWidth === 'number' &&
              shellWidth > 0 &&
              typeof aiPanelPercent === 'number' &&
              aiPanelPercent >= 0 &&
              aiPanelPercent <= 100
            ) {
              const nextAiPanelWidth = clampAiPanelWidth((shellWidth * aiPanelPercent) / 100, shellWidth)
              layout.rememberPanelWidth(nextAiPanelWidth)
              updatePolicyOverlayGeometry(nextAiPanelWidth)
            }
          }}
        >
          <Panel
            id="ai-panel"
            panelRef={aiPanelRef}
            defaultSize={`${layout.aiPanelWidth}px`}
            minSize={`${AI_PANEL_MIN_WIDTH}px`}
            maxSize="66%"
            collapsedSize={0}
            collapsible
            groupResizeBehavior="preserve-pixel-size"
            className="workspace-panel"
          >
            <AgentSidebar
              section={layout.section}
              onSelectSection={handleSelectSection}
              policyView={layout.policyView}
              onSelectPolicyView={openPolicyOverlay}
              catalog={shell.agentCatalog}
              workspace={shell.workspace}
              connections={shell.connections}
              workspaceContext={shell.workspaceContext}
              tools={shell.tools}
              lastResponse={shell.lastResponse}
              notice={shell.notice}
              pendingApproval={shell.pendingApproval}
              agentFeed={shell.agentFeed}
              isSubmittingConversation={shell.isSubmittingConversation}
              isConfirmingApproval={shell.isConfirmingApproval}
              trustedRules={shell.trustedRules}
              ignoreRules={shell.ignoreRules}
              auditEvents={shell.auditEvents}
              widgetContextEnabled={shell.widgetContextEnabled}
              onSelectProfile={(id) => shell.setActiveSelection('profile', id)}
              onSelectRole={(id) => shell.setActiveSelection('role', id)}
              onSelectMode={(id) => shell.setActiveSelection('mode', id)}
              onToggleWidgetContext={shell.toggleWidgetContext}
              onFocusWidget={shell.focusWidget}
              onCreateTerminalTab={() => shell.createTerminalTab()}
              onCreateTerminalTabWithConnection={shell.createTerminalTabWithConnection}
              onSelectConnection={shell.selectConnection}
              onCheckConnection={shell.checkConnection}
              onSaveSSHConnection={shell.saveSSHConnection}
              onExecuteTool={shell.executeTool}
              onAddTrustedRule={shell.addTrustedRule}
              onRemoveTrustedRule={shell.removeTrustedRule}
              onAddIgnoreRule={shell.addIgnoreRule}
              onRemoveIgnoreRule={shell.removeIgnoreRule}
              onRunAgentAction={shell.runAgentAction}
              onSubmitPrompt={shell.submitAgentPrompt}
              onAttachClick={shell.reportAgentAttachmentUnavailable}
              onConfirmApproval={shell.confirmPendingRequest}
              onDismissNotice={shell.clearNotice}
            />
          </Panel>
          <Separator
            disabled={!layout.aiPanelVisible}
            className={layout.aiPanelVisible ? 'workspace-resize-handle' : 'workspace-resize-handle collapsed'}
          />

          <Panel
            id="main-panel"
            defaultSize={100}
            minSize="420px"
            groupResizeBehavior="preserve-relative-size"
            className="workspace-panel"
          >
            <section className="workspace-main">
              <section className="workspace-stage">
                {shell.client && shell.activeWidget ? (
                  <TerminalSurface
                    client={shell.client}
                    widgetId={shell.activeWidget.id}
                    state={shell.terminalState}
                    onInterrupt={shell.interruptWidget}
                    onOpenConnections={() => handleSelectSection('connections')}
                    onTerminalAction={async () => {
                      await shell.refreshTerminalState(shell.activeWidget?.id)
                    }}
                  />
                ) : (
                  <section className="terminal-card loading-panel">Connecting to runtime…</section>
                )}
              </section>

              <WidgetDock
                workspace={shell.workspace}
                activeWidget={shell.activeWidget}
                onFocusWidget={shell.focusWidget}
                onCreateTerminalTab={() => shell.createTerminalTab()}
                section={layout.section}
                onSelectSection={handleSelectSection}
                onSelectPolicyView={openPolicyOverlay}
                settingsOpen={policyOverlayView !== null}
              />
            </section>
          </Panel>
        </Group>
      </section>
      {policyOverlay}
    </main>
  )
}

export default App
