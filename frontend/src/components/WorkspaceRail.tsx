import type { Widget, Workspace } from '../types'

type WorkspaceRailProps = {
  workspace: Workspace | null
  activeWidgetId?: string
  onFocusWidget: (widget: Widget) => void | Promise<void>
}

export function WorkspaceRail({ workspace, activeWidgetId, onFocusWidget }: WorkspaceRailProps) {
  return (
    <aside className="widget-rail">
      <header>
        <p className="eyebrow">Workspace</p>
        <h2>{workspace?.name ?? 'Booting workspace…'}</h2>
      </header>
      <div className="widget-list">
        {workspace?.widgets.map((widget) => (
          <button
            key={widget.id}
            className={widget.id === activeWidgetId ? 'widget-pill active' : 'widget-pill'}
            onClick={() => void onFocusWidget(widget)}
          >
            <strong>{widget.title}</strong>
            <span>{widget.description ?? widget.kind}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
