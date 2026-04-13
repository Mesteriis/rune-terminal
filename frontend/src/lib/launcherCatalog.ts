import type { PolicyView } from '../components/PolicyViews'
import type { ShellSection } from '../components/ShellSections'
import type { Widget, Workspace } from '../types'

export type LauncherAction =
  | { type: 'create-terminal' }
  | { type: 'focus-widget'; widget: Widget }
  | { type: 'open-section'; section: ShellSection; policyView?: PolicyView }

export type LauncherEntry = {
  id: string
  title: string
  description: string
  category: 'create' | 'workspace' | 'utility'
  icon: string
  action: LauncherAction
}

export function buildLauncherEntries(workspace: Workspace | null): LauncherEntry[] {
  const entries: LauncherEntry[] = [
    {
      id: 'create-terminal',
      title: 'New terminal',
      description: 'Open a fresh terminal tab from the launcher.',
      category: 'create',
      icon: 'fa-square-plus',
      action: { type: 'create-terminal' },
    },
    {
      id: 'open-agent',
      title: 'AI panel',
      description: 'Return to the TideTerm-shaped AI panel.',
      category: 'utility',
      icon: 'fa-sparkles',
      action: { type: 'open-section', section: 'agent' },
    },
    {
      id: 'open-runtime',
      title: 'Runtime tools',
      description: 'Inspect tool metadata and execute runtime calls.',
      category: 'utility',
      icon: 'fa-cube',
      action: { type: 'open-section', section: 'tools' },
    },
    {
      id: 'open-audit',
      title: 'Audit trail',
      description: 'Review recent operations, approvals, and policy outcomes.',
      category: 'utility',
      icon: 'fa-clock-rotate-left',
      action: { type: 'open-section', section: 'audit' },
    },
    {
      id: 'open-settings',
      title: 'Settings overview',
      description: 'Open shell settings, privacy, and launcher help.',
      category: 'utility',
      icon: 'fa-gear',
      action: { type: 'open-section', section: 'policy', policyView: 'overview' },
    },
    {
      id: 'open-help',
      title: 'Help and tips',
      description: 'Open the shell help card and discover utility entry points.',
      category: 'utility',
      icon: 'fa-circle-question',
      action: { type: 'open-section', section: 'policy', policyView: 'help' },
    },
    {
      id: 'open-trusted',
      title: 'Trusted tools',
      description: 'Review repeat-approved tools and confirmation shortcuts.',
      category: 'utility',
      icon: 'fa-shield-halved',
      action: { type: 'open-section', section: 'policy', policyView: 'trusted' },
    },
    {
      id: 'open-ignore',
      title: 'Secret shield',
      description: 'Manage protected paths and redaction rules.',
      category: 'utility',
      icon: 'fa-lock',
      action: { type: 'open-section', section: 'policy', policyView: 'ignore' },
    },
  ]

  const widgetEntries = (workspace?.widgets ?? []).map<LauncherEntry>((widget) => ({
    id: `widget-${widget.id}`,
    title: widget.title,
    description: widget.description ?? `Focus the ${widget.kind} widget in the workspace shell.`,
    category: 'workspace',
    icon: iconForWidget(widget.kind),
    action: { type: 'focus-widget', widget },
  }))

  return [...entries, ...widgetEntries]
}

function iconForWidget(kind: string) {
  switch (kind) {
    case 'terminal':
      return 'fa-terminal'
    default:
      return 'fa-window-maximize'
  }
}
