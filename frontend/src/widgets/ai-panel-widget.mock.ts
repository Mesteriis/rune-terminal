export type AiPromptCardState = {
  id: string
  title: string
  subtitle: string
}

export type AiPanelWidgetMockState = {
  title: string
  toolbarLabel: string
  activeTool: string
  prompts: AiPromptCardState[]
  composerPlaceholder: string
}

export const aiPanelWidgetMockState: AiPanelWidgetMockState = {
  title: 'AI RUNE',
  toolbarLabel: 'TOOL BAR',
  activeTool: 'Chat',
  prompts: [
    {
      id: 'prompt-1',
      title: 'Prompt 1',
      subtitle: 'Pinned workspace reasoning preset',
    },
    {
      id: 'prompt-2',
      title: 'Prompt 2',
      subtitle: 'Focused code transformation preset',
    },
  ],
  composerPlaceholder: 'Text Area',
}
