export type ShellSection = 'agent' | 'launcher' | 'connections' | 'tools' | 'policy' | 'audit'

export const SHELL_SECTION_LABELS: Record<ShellSection, string> = {
  agent: 'Agent',
  launcher: 'Launcher',
  connections: 'Connections',
  tools: 'Runtime',
  policy: 'Settings',
  audit: 'Audit',
}
