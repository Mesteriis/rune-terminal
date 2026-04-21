import type { AiPanelWidgetState } from '@/features/agent/model/types'

export const aiPanelWidgetMockState: AiPanelWidgetState = {
  title: 'AI RUNE',
  toolbarLabel: 'TOOL BAR',
  activeTool: 'Chat',
  messages: [
    {
      id: 'message-1',
      role: 'user',
      content: 'Review the current frontend slice and propose the narrowest safe refactor sequence.',
    },
    {
      id: 'message-2',
      role: 'assistant',
      content: 'Keep the slice frontend-only and refactor the transcript view model before changing layout.',
      meta: {
        status: 'complete',
        provider: 'mock',
        model: 'mock-model',
        prompt: 'Review the current frontend slice and propose the narrowest safe refactor sequence.',
        reasoning: ['Status: complete', 'Provider: mock', 'Model: mock-model'].join('\n'),
        summary: 'Assistant · complete · mock · mock-model',
      },
    },
    {
      id: 'message-3',
      role: 'user',
      content: 'Move execution details out of the main chat flow and keep the transcript readable.',
    },
    {
      id: 'message-4',
      role: 'assistant',
      content: 'Split message content from execution metadata, then render the details separately.',
      meta: {
        status: 'complete',
        provider: 'mock',
        model: 'mock-model',
        prompt: 'Move execution details out of the main chat flow and keep the transcript readable.',
        reasoning: ['Status: complete', 'Provider: mock', 'Model: mock-model'].join('\n'),
        summary: 'Assistant · complete · mock · mock-model',
      },
    },
  ],
  composerPlaceholder: 'Text Area',
}
