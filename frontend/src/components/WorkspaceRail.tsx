import type { Widget, Workspace } from '../types'

type WorkspaceRailProps = {
  workspace: Workspace | null
  repoRoot: string
  activeWidgetId?: string
  onFocusWidget: (widget: Widget) => void | Promise<void>
}

export function WorkspaceRail({ workspace, repoRoot, activeWidgetId, onFocusWidget }: WorkspaceRailProps) {
  const activeWidget = workspace?.widgets.find((widget) => widget.id === activeWidgetId)

  return (
    <header className="workspace-tabs">
      <div className="workspace-tabs-brand">
        <span>RT</span>
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

      <div className="workspace-tabs-context">
        <div className="workspace-tabs-workspace">
          <p className="eyebrow">Workspace</p>
          <strong>{workspace?.name ?? 'Loading workspace'}</strong>
        </div>
        <div className="workspace-tabs-meta">
          <span>{activeWidget?.title ?? 'No active widget'}</span>
          <code>{repoRoot || 'discovering workspace root…'}</code>
        </div>
      </div>
    </header>
  )
}
