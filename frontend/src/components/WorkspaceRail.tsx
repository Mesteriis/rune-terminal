import { useState } from 'react'

import type { Tab, Workspace } from '../types'
import { WorkspaceTab } from './WorkspaceTab'

type WorkspaceRailProps = {
  workspace: Workspace | null
  repoRoot: string
  activeTabId?: string
  aiPanelVisible: boolean
  onToggleAIPanel: () => void
  onFocusTab: (tabId: string) => void | Promise<void>
  onCreateTab: () => void | Promise<void>
  onCloseTab: (tabId: string) => void | Promise<void>
  onMoveTab: (tabId: string, beforeTabId: string) => void | Promise<void>
  onRenameTab: (tabId: string, title: string) => void | Promise<void>
  onToggleTabPinned: (tabId: string, pinned: boolean) => void | Promise<void>
}

export function WorkspaceRail({
  workspace,
  repoRoot,
  activeTabId,
  aiPanelVisible,
  onToggleAIPanel,
  onFocusTab,
  onCreateTab,
  onCloseTab,
  onMoveTab,
  onRenameTab,
  onToggleTabPinned,
}: WorkspaceRailProps) {
  const activeTab = workspace?.tabs.find((tab) => tab.id === activeTabId)
  const { pinnedTabs, regularTabs } = partitionTabs(workspace?.tabs ?? [])
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null)
  const [hoverTabId, setHoverTabId] = useState<string | null>(null)

  return (
    <header className="workspace-tabs">
      <div className="workspace-tabs-left">
        <button className="workspace-switcher" title={workspace?.name ?? 'Loading workspace'}>
          <span className="workspace-switcher-badge">WS</span>
          <strong>{workspace?.name ?? 'Loading workspace'}</strong>
        </button>
      </div>

      <div className="workspace-tabs-strip">
        {pinnedTabs.map((tab) => (
          <WorkspaceTab
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            dragging={draggingTabId === tab.id}
            dropTarget={hoverTabId === tab.id}
            onSelect={() => onFocusTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={(title) => onRenameTab(tab.id, title)}
            onTogglePinned={() => onToggleTabPinned(tab.id, !tab.pinned)}
            onDragStart={() => setDraggingTabId(tab.id)}
            onDragEnter={() => setHoverTabId(tab.id)}
            onDragEnd={() => {
              setDraggingTabId(null)
              setHoverTabId(null)
            }}
            onDropTab={() => handleDrop(tab)}
          />
        ))}
        {pinnedTabs.length > 0 && regularTabs.length > 0 ? <div className="workspace-tab-divider" /> : null}
        {regularTabs.map((tab) => (
          <WorkspaceTab
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            dragging={draggingTabId === tab.id}
            dropTarget={hoverTabId === tab.id}
            onSelect={() => onFocusTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={(title) => onRenameTab(tab.id, title)}
            onTogglePinned={() => onToggleTabPinned(tab.id, !tab.pinned)}
            onDragStart={() => setDraggingTabId(tab.id)}
            onDragEnter={() => setHoverTabId(tab.id)}
            onDragEnd={() => {
              setDraggingTabId(null)
              setHoverTabId(null)
            }}
            onDropTab={() => handleDrop(tab)}
          />
        ))}
        <button className="workspace-tab workspace-tab-add" onClick={() => void onCreateTab()}>
          <strong>+</strong>
          <span>New tab</span>
        </button>
        {workspace?.tabs.length ? null : <div className="workspace-tab placeholder">Booting workspace…</div>}
      </div>

      <div className="workspace-tabs-right">
        <div className="workspace-tabs-meta">
          <span>{activeTab?.title ?? 'No active tab'}</span>
          <code>{repoRoot || 'discovering workspace root…'}</code>
        </div>
        <button className={aiPanelVisible ? 'workspace-ai-toggle active' : 'workspace-ai-toggle'} onClick={onToggleAIPanel}>
          <span className="workspace-ai-icon">✦</span>
          <span>AI</span>
        </button>
      </div>
    </header>
  )

  function handleDrop(targetTab: Tab) {
    if (!draggingTabId || draggingTabId === targetTab.id) {
      setDraggingTabId(null)
      setHoverTabId(null)
      return
    }
    const draggingTab = workspace?.tabs.find((tab) => tab.id === draggingTabId)
    if (!draggingTab || draggingTab.pinned !== targetTab.pinned) {
      setDraggingTabId(null)
      setHoverTabId(null)
      return
    }
    void onMoveTab(draggingTabId, targetTab.id)
    setDraggingTabId(null)
    setHoverTabId(null)
  }
}

function partitionTabs(tabs: Tab[]) {
  return tabs.reduce(
    (groups, tab) => {
      if (tab.pinned) {
        groups.pinnedTabs.push(tab)
      } else {
        groups.regularTabs.push(tab)
      }
      return groups
    },
    { pinnedTabs: [] as Tab[], regularTabs: [] as Tab[] },
  )
}
