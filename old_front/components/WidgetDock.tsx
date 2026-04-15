import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import { type PolicyView } from './PolicyViews'
import { AppIcon, type AppIconName } from './icons/Icon'
import type { Widget, Workspace } from '../types'
import { WidgetDockMenuButton } from './WidgetDockMenuButton'

type WidgetDockProps = {
  workspace: Workspace | null
  activeWidget: Widget | null
  onFocusWidget: (widget: Widget) => void | Promise<void>
  onCreateTerminalTab: () => void | Promise<void>
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
  onSelectPolicyView: (view: PolicyView) => void
  settingsOpen: boolean
}

type MenuItem = {
  label: string
  detail: string
  icon: AppIconName
  onSelect: () => void | Promise<void>
}

export function WidgetDock({
  workspace,
  activeWidget,
  onFocusWidget,
  onCreateTerminalTab,
  section,
  onSelectSection,
  onSelectPolicyView,
  settingsOpen,
}: WidgetDockProps) {
  const launcherActive = section === 'launcher' || section === 'connections' || section === 'tools'
  const settingsActive = settingsOpen || section === 'policy' || section === 'audit'
  const launcherItems = [
    {
      label: 'Launcher',
      detail: 'Open the searchable shell launcher and widget catalog',
      icon: 'cube',
      onSelect: () => onSelectSection('launcher'),
    },
    {
      label: 'New terminal',
      detail: 'Open a fresh terminal tab from the shell launcher',
      icon: 'plus',
      onSelect: () => onCreateTerminalTab(),
    },
    {
      label: SHELL_SECTION_LABELS.connections,
      detail: 'Choose the default shell target and manage SSH profiles',
      icon: 'plug',
      onSelect: () => onSelectSection('connections'),
    },
    {
      label: SHELL_SECTION_LABELS.agent,
      detail: 'Return to the AI panel and active workspace context',
      icon: 'sparkles',
      onSelect: () => onSelectSection('agent'),
    },
    {
      label: SHELL_SECTION_LABELS.tools,
      detail: 'Open runtime utilities and inspect tool metadata',
      icon: 'terminal',
      onSelect: () => onSelectSection('tools'),
    },
    {
      label: SHELL_SECTION_LABELS.audit,
      detail: 'Inspect recent runtime operations and approvals',
      icon: 'clock',
      onSelect: () => onSelectSection('audit'),
    },
    {
      label: 'Help',
      detail: 'Open the shell help and utility overview',
      icon: 'circle-question',
      onSelect: () => onSelectPolicyView('help'),
    },
    ...((workspace?.widgets ?? []).slice(0, 6).map((widget) => ({
      label: widget.title,
      detail: `Focus ${widget.kind} widget`,
      icon: 'terminal',
      onSelect: () => onFocusWidget(widget),
    })) ?? []),
  ] as MenuItem[]

  return (
    <aside className="widget-dock">
      <div className="widget-dock-stack">
        {(workspace?.widgets ?? []).map((widget) => (
          <button
            key={widget.id}
            className={widget.id === activeWidget?.id ? 'widget-dock-button active' : 'widget-dock-button'}
            title={widget.description ?? widget.title}
            aria-label={widget.title}
            onClick={() => void onFocusWidget(widget)}
          >
            <span>{widget.title.slice(0, 2).toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="widget-dock-footer">
        <WidgetDockMenuButton
          label={<AppIcon name="cube" />}
          title="Launcher and shell utilities"
          items={launcherItems}
          active={launcherActive}
          compact={true}
        />
        <WidgetDockMenuButton
          label={<AppIcon name="cog" />}
          title="Settings and help"
          active={settingsActive}
          items={[
            {
              label: 'Settings',
              detail: 'Open shell settings and privacy controls',
              icon: 'cog',
              onSelect: () => onSelectPolicyView('overview'),
            },
            {
              label: 'Trusted tools',
              detail: 'Review tool rules that can skip repeated confirmation',
              icon: 'shield',
              onSelect: () => onSelectPolicyView('trusted'),
            },
            {
              label: 'Secret shield',
              detail: 'Manage protected path rules and redaction behavior',
              icon: 'lock',
              onSelect: () => onSelectPolicyView('ignore'),
            },
            {
              label: 'Help',
              detail: 'Open the shell help card and utility entry points',
              icon: 'circle-question',
              onSelect: () => onSelectPolicyView('help'),
            },
          ]}
        />
      </div>
    </aside>
  )
}
