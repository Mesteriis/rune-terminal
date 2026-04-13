export type ShellSection = 'agent' | 'launcher' | 'tools' | 'policy' | 'audit'

export const SHELL_SECTION_LABELS: Record<ShellSection, string> = {
  agent: 'Agent',
  launcher: 'Launcher',
  tools: 'Runtime',
  policy: 'Settings',
  audit: 'Audit',
}
