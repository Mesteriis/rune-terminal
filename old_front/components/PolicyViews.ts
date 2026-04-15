export type PolicyView = 'overview' | 'trusted' | 'ignore' | 'help'

export const POLICY_VIEW_LABELS: Record<PolicyView, string> = {
  overview: 'Overview',
  trusted: 'Trusted tools',
  ignore: 'Secret shield',
  help: 'Help',
}
