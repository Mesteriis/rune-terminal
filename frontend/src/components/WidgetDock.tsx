import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import type { Widget, Workspace } from '../types'

type WidgetDockProps = {
  workspace: Workspace | null
  activeWidget: Widget | null
  onFocusWidget: (widget: Widget) => void | Promise<void>
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
}

const AUXILIARY_BADGES: Record<Exclude<ShellSection, 'agent'>, string> = {
  tools: 'TL',
  policy: 'SG',
  audit: 'AU',
}

export function WidgetDock({ workspace, activeWidget, onFocusWidget, section, onSelectSection }: WidgetDockProps) {
  return (
    <aside className="widget-dock">
      <div className="widget-dock-brand">RT</div>
      <div className="widget-dock-stack">
        {(workspace?.widgets ?? []).map((widget) => (
          <button
            key={widget.id}
            className={widget.id === activeWidget?.id ? 'widget-dock-button active' : 'widget-dock-button'}
            title={widget.description ?? widget.title}
            onClick={() => void onFocusWidget(widget)}
          >
            <span>{widget.title.slice(0, 2).toUpperCase()}</span>
            <small>{widget.kind}</small>
          </button>
        ))}
      </div>
      <div className="widget-dock-footer">
        <div className="widget-dock-footer-actions">
          {(['tools', 'policy', 'audit'] as const).map((entry) => (
            <button
              key={entry}
              className={entry === section ? 'widget-dock-mini active' : 'widget-dock-mini'}
              title={SHELL_SECTION_LABELS[entry]}
              onClick={() => onSelectSection(entry)}
            >
              {AUXILIARY_BADGES[entry]}
            </button>
          ))}
        </div>
        <strong>{activeWidget?.title ?? `${workspace?.widgets.length ?? 0} widgets`}</strong>
        <span>{activeWidget?.description ?? activeWidget?.kind ?? 'No active widget'}</span>
      </div>
    </aside>
  )
}
