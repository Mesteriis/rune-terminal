import type { Widget, Workspace } from '../types'

type WorkspaceRailProps = {
  workspace: Workspace | null
  repoRoot: string
  activeWidgetId?: string
  aiPanelVisible: boolean
  onToggleAIPanel: () => void
  onFocusWidget: (widget: Widget) => void | Promise<void>
}

export function WorkspaceRail({
  workspace,
  repoRoot,
  activeWidgetId,
  aiPanelVisible,
  onToggleAIPanel,
  onFocusWidget,
}: WorkspaceRailProps) {
  const activeWidget = workspace?.widgets.find((widget) => widget.id === activeWidgetId)

  return (
    <header className="workspace-tabs">
      <div className="workspace-tabs-left">
        <button className="workspace-switcher" title={workspace?.name ?? 'Loading workspace'}>
          <span className="workspace-switcher-badge">WS</span>
          <strong>{workspace?.name ?? 'Loading workspace'}</strong>
        </button>
      </div>

      <div className="workspace-tabs-strip">
        {workspace?.widgets.map((widget) => (
          <button
            key={widget.id}
            className={widget.id === activeWidgetId ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => void onFocusWidget(widget)}
          >
            <strong>{widget.title}</strong>
            <span>{widget.description ?? widget.kind}</span>
          </button>
        ))}
        {workspace?.widgets.length ? null : <div className="workspace-tab placeholder">Booting workspace…</div>}
      </div>

      <div className="workspace-tabs-right">
        <div className="workspace-tabs-meta">
          <span>{activeWidget?.title ?? 'No active widget'}</span>
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
