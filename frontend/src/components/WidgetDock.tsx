import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import { type PolicyView } from './PolicyViews'
import type { Widget, Workspace } from '../types'
import { WidgetDockMenuButton } from './WidgetDockMenuButton'

type WidgetDockProps = {
  workspace: Workspace | null
  activeWidget: Widget | null
  onFocusWidget: (widget: Widget) => void | Promise<void>
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
  onSelectPolicyView: (view: PolicyView) => void
}

export function WidgetDock({
  workspace,
  activeWidget,
  onFocusWidget,
  section,
  onSelectSection,
  onSelectPolicyView,
}: WidgetDockProps) {
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
            label={<i className="fa fa-cube" />}
            title="Runtime utilities"
            items={[
              {
                label: SHELL_SECTION_LABELS.tools,
                detail: 'Open runtime utilities and inspect tool metadata',
                onSelect: () => onSelectSection('tools'),
              },
              {
                label: SHELL_SECTION_LABELS.audit,
                detail: 'Inspect recent runtime operations and approvals',
                onSelect: () => onSelectSection('audit'),
              },
            ]}
          />
          <WidgetDockMenuButton
            label={<i className="fa fa-gear" />}
            title="Settings and help"
            items={[
              {
                label: 'Settings overview',
                detail: 'Open shell settings and privacy controls',
                onSelect: () => onSelectPolicyView('overview'),
              },
              {
                label: 'Trusted tools',
                detail: 'Review tool rules that can skip repeated confirmation',
                onSelect: () => onSelectPolicyView('trusted'),
              },
              {
                label: 'Secret shield',
                detail: 'Manage protected path rules and redaction behavior',
                onSelect: () => onSelectPolicyView('ignore'),
              },
              {
                label: 'Help',
                detail: 'Open the shell help card and utility entry points',
                onSelect: () => onSelectPolicyView('help'),
              },
            ]}
          />
        </div>
        <strong>{activeWidget?.title ?? `${workspace?.widgets.length ?? 0} widgets`}</strong>
        <span>
          {section === 'agent'
            ? activeWidget?.description ?? activeWidget?.kind ?? 'No active widget'
            : `Focused shell utility: ${SHELL_SECTION_LABELS[section]}`}
        </span>
      </div>
    </aside>
  )
}
