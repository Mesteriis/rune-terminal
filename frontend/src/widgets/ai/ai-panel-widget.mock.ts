import type { AiPanelWidgetState } from '@/features/agent/model/types'

export const aiPanelWidgetMockState: AiPanelWidgetState = {
  title: 'AI RUNE',
  toolbarLabel: 'TOOL BAR',
  activeTool: 'Chat',
  prompts: [
    {
      id: 'prompt-1',
      title: 'Task 1',
      current: {
        preview:
          'Pinned workspace reasoning preset for refactors, migration planning, and high-signal review passes across the current frontend slice.',
        prompt:
          'Review the current frontend slice and propose the narrowest safe refactor sequence. Keep scope constrained to the AI panel and adjacent shared UI only. Prefer explicit diffs over abstractions.',
        reasoning: [
          'Bias the agent toward small-step repository-safe changes with explicit scope and honest validation.',
          'Keep the slice frontend-only and avoid hidden backend semantics or speculative abstractions.',
          'Prefer a readable commit ladder and narrow diffs over sweeping workspace rewrites.',
        ],
        summary:
          'Use this when the user wants a focused architectural pass with explicit scope limits, careful validation, and no backend drift.',
      },
      rollback: {
        preview:
          'Earlier conservative preset that keeps the assistant in audit mode with almost no implementation latitude until the user confirms each step.',
        prompt:
          'Inspect the current slice and list only the minimal safe changes required to resolve the stated UI issue. Do not expand scope. Do not introduce new abstractions.',
        reasoning: [
          'Return to review-first behavior before implementation begins.',
          'Only describe the smallest safe changes that satisfy the stated UI issue.',
          'Avoid new abstractions, fake services, or backend integration points.',
        ],
        summary: 'Rollback mode restores a tighter audit posture before implementation starts.',
      },
    },
    {
      id: 'prompt-2',
      title: 'Task 2',
      current: {
        preview:
          'Focused code transformation preset for turning a rough UX idea into a static, renderable widget slice with honest validation and no backend coupling.',
        prompt:
          'Build a static frontend widget mock that proves layout, hierarchy, and local interaction only. Use existing tokens and shared UI layers. Keep runtime semantics fake-free.',
        reasoning: [
          'Turn the requested UX into a renderable shell surface without inventing runtime execution.',
          'Keep the interaction keyboard-oriented and dense, but stop before fake services or command execution logic.',
          'Expose only enough local state to validate layout, scrolling, and review/approval affordances.',
        ],
        summary: 'Use this for new static widget slices, demos, and frontend-only interaction prototypes.',
        approvals: [
          {
            id: 'approval-1',
            title: 'Run frontend validation sweep',
            command: 'npm --prefix frontend run validate',
            status: 'approval-required',
            scope: 'Local command',
          },
          {
            id: 'approval-2',
            title: 'Open visual smoke in browser',
            command: 'npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort',
            status: 'queued',
            scope: 'Local dev server',
          },
        ],
      },
      rollback: {
        preview:
          'Older widget-composition preset that keeps the output even more presentation-only and avoids local interaction beyond expand/collapse.',
        prompt:
          'Compose the requested widget from existing primitives and components. Prefer static state. Add only the minimum local interaction required for visual validation.',
        reasoning: [
          'Constrain the slice to static composition with lightweight local state only.',
          'Remove richer interaction if it starts imitating a backend-driven workflow.',
        ],
        summary: 'Rollback mode narrows the widget back to static composition with minimal local behavior.',
      },
    },
    {
      id: 'prompt-3',
      title: 'Task 3',
      current: {
        preview:
          'Current live working set for the AI panel: scrolling prompt history, explicit approvals, and a permanently open latest prompt for continuous operator context.',
        prompt:
          'Adapt the AI shell so historical prompts stay collapsible, the latest prompt remains open, approval-required commands read as explicit review items, and long reasoning remains scrollable and easy to scan.',
        reasoning: [
          'Keep old prompts compact so the operator can skim history without losing vertical density.',
          'Treat reasoning as a list of discrete steps rather than a single prose block so it can grow without becoming a wall of text.',
          'Expose approval-required commands as explicit request rows with status labels, scope labels, and raw command text.',
          'Pin the newest prompt open by default so the current thought process stays visible while the stack remains scrollable.',
          'Keep everything static and backend-free in this slice: no execution, no real approvals, no fake filesystem mutations.',
        ],
        summary:
          'This prompt defines the current AI panel slice: scannable history above, current prompt expanded below, approvals visible, and overflow handled by the prompt stack scroll area.',
        approvals: [
          {
            id: 'approval-3',
            title: 'Apply workspace patch set',
            command:
              'git add frontend/src/widgets/ai/ai-panel-widget.tsx frontend/src/widgets/ai/ai-prompt-card-widget.tsx && git commit -m "feat(frontend): refine ai prompt history layout"',
            status: 'approval-required',
            scope: 'Git write',
          },
        ],
      },
    },
  ],
  composerPlaceholder: 'Text Area',
}
