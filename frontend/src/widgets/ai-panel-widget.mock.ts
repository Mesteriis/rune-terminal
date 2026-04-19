export type AiPromptCardSnapshot = {
  preview: string
  prompt: string
  reasoning: string
  summary: string
}

export type AiPromptCardState = {
  id: string
  title: string
  current: AiPromptCardSnapshot
  rollback?: AiPromptCardSnapshot
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
      current: {
        preview:
          'Pinned workspace reasoning preset for refactors, migration planning, and high-signal review passes across the current frontend slice.',
        prompt:
          'Review the current frontend slice and propose the narrowest safe refactor sequence. Keep scope constrained to the AI panel and adjacent shared UI only. Prefer explicit diffs over abstractions.',
        reasoning:
          'This prompt biases the assistant toward small-step repository-safe changes. It is tuned for AGENTS discipline, commit ladders, and frontend-only visual scaffolding.',
        summary:
          'Use this when the user wants a focused architectural pass with explicit scope limits, careful validation, and no backend drift.',
      },
      rollback: {
        preview:
          'Earlier conservative preset that keeps the assistant in audit mode with almost no implementation latitude until the user confirms each step.',
        prompt:
          'Inspect the current slice and list only the minimal safe changes required to resolve the stated UI issue. Do not expand scope. Do not introduce new abstractions.',
        reasoning:
          'This rollback snapshot is stricter and slower. It is useful when the current prompt became too implementation-forward and needs to return to review-first behavior.',
        summary:
          'Rollback mode restores a tighter audit posture before implementation starts.',
      },
    },
    {
      id: 'prompt-2',
      title: 'Prompt 2',
      current: {
        preview:
          'Focused code transformation preset for turning a rough UX idea into a static, renderable widget slice with honest validation and no backend coupling.',
        prompt:
          'Build a static frontend widget mock that proves layout, hierarchy, and local interaction only. Use existing tokens and shared UI layers. Keep runtime semantics fake-free.',
        reasoning:
          'This preset is aimed at UI ideation work where the user needs a believable surface without accidentally bootstrapping fake app logic or service architecture.',
        summary:
          'Use this for new static widget slices, demos, and frontend-only interaction prototypes.',
      },
      rollback: {
        preview:
          'Older widget-composition preset that keeps the output even more presentation-only and avoids local interaction beyond expand/collapse.',
        prompt:
          'Compose the requested widget from existing primitives and components. Prefer static state. Add only the minimum local interaction required for visual validation.',
        reasoning:
          'This snapshot is useful when the current preset starts drifting toward richer UX logic than the slice really needs.',
        summary:
          'Rollback mode narrows the widget back to static composition with minimal local behavior.',
      },
    },
  ],
  composerPlaceholder: 'Text Area',
}
