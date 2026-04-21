export type AiPromptCardSnapshot = {
  preview: string
  prompt: string
  reasoning: string[]
  summary: string
  approvals?: AiApprovalRequest[]
}

export type AiApprovalRequest = {
  id: string
  title: string
  command: string
  status: 'approval-required' | 'queued' | 'approved'
  scope: string
}

export type AiPromptCardState = {
  id: string
  title: string
  current: AiPromptCardSnapshot
  rollback?: AiPromptCardSnapshot
}

export type AiPanelWidgetState = {
  title: string
  toolbarLabel: string
  activeTool: string
  prompts: AiPromptCardState[]
  composerPlaceholder: string
}
