import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import type { Widget, Workspace } from '../types'
import { WidgetDockMenuButton } from './WidgetDockMenuButton'

type WidgetDockProps = {
  workspace: Workspace | null
  activeWidget: Widget | null
  onFocusWidget: (widget: Widget) => void | Promise<void>
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
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
          <WidgetDockMenuButton
            label="RT"
            title="Runtime tools"
            items={[
              {
                label: SHELL_SECTION_LABELS.tools,
                detail: 'Open the internal tool runtime console',
                onSelect: () => onSelectSection('tools'),
              },
              {
                label: SHELL_SECTION_LABELS.audit,
                detail: 'Inspect recent runtime and approval events',
                onSelect: () => onSelectSection('audit'),
              },
            ]}
          />
          <WidgetDockMenuButton
            label="SG"
            title="Settings and policy"
            items={[
              {
                label: SHELL_SECTION_LABELS.policy,
                detail: 'Open trusted and ignore rule controls',
                onSelect: () => onSelectSection('policy'),
              },
            ]}
          />
        </div>
        <strong>{activeWidget?.title ?? `${workspace?.widgets.length ?? 0} widgets`}</strong>
        <span>
          {section === 'agent'
            ? activeWidget?.description ?? activeWidget?.kind ?? 'No active widget'
            : `Focused shell section: ${SHELL_SECTION_LABELS[section]}`}
        </span>
      </div>
    </aside>
  )
}
