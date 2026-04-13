export type ShellSection = 'agent' | 'tools' | 'policy' | 'audit'

export const SHELL_SECTION_LABELS: Record<ShellSection, string> = {
  agent: 'Agent',
  tools: 'Runtime',
  policy: 'Settings',
  audit: 'Audit',
}
