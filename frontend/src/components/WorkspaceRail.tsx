import type { Workspace } from '../types'

type WorkspaceRailProps = {
  workspace: Workspace | null
  repoRoot: string
  activeTabId?: string
  aiPanelVisible: boolean
  onToggleAIPanel: () => void
  onFocusTab: (tabId: string) => void | Promise<void>
}

export function WorkspaceRail({
  workspace,
  repoRoot,
  activeTabId,
  aiPanelVisible,
  onToggleAIPanel,
  onFocusTab,
}: WorkspaceRailProps) {
  const activeTab = workspace?.tabs.find((tab) => tab.id === activeTabId)

  return (
    <header className="workspace-tabs">
      <div className="workspace-tabs-left">
        <button className="workspace-switcher" title={workspace?.name ?? 'Loading workspace'}>
          <span className="workspace-switcher-badge">WS</span>
          <strong>{workspace?.name ?? 'Loading workspace'}</strong>
        </button>
      </div>

      <div className="workspace-tabs-strip">
        {workspace?.tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTabId ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => void onFocusTab(tab.id)}
          >
            <strong>{tab.title}</strong>
            <span>{tab.description ?? tab.widget_ids.join(', ')}</span>
          </button>
        ))}
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
}
