import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import type { Widget, Workspace } from '../types'

type WidgetDockProps = {
  workspace: Workspace | null
  activeWidget: Widget | null
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
}

const SECTION_BADGES: Record<ShellSection, string> = {
  agent: 'AI',
  tools: 'TL',
  policy: 'SG',
  audit: 'AU',
}

export function WidgetDock({ workspace, activeWidget, section, onSelectSection }: WidgetDockProps) {
  return (
    <aside className="widget-dock">
      <div className="widget-dock-brand">RT</div>
      <div className="widget-dock-stack">
        {(['agent', 'tools', 'policy', 'audit'] as ShellSection[]).map((entry) => (
          <button
            key={entry}
            className={entry === section ? 'widget-dock-button active' : 'widget-dock-button'}
            title={SHELL_SECTION_LABELS[entry]}
            onClick={() => onSelectSection(entry)}
          >
            <span>{SECTION_BADGES[entry]}</span>
            <small>{SHELL_SECTION_LABELS[entry]}</small>
          </button>
        ))}
      </div>
      <div className="widget-dock-footer">
        <strong>{workspace?.widgets.length ?? 0}</strong>
        <span>{activeWidget?.title ?? 'No active widget'}</span>
      </div>
    </aside>
  )
}
