import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AiComposerWidget } from '@/widgets/ai/ai-composer-widget'

describe('AiComposerWidget', () => {
  it('submits on Enter in enter-sends mode', () => {
    const onSubmit = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        onSubmit={onSubmit}
        placeholder="Text Area"
        submitMode="enter-sends"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    fireEvent.keyDown(screen.getByPlaceholderText('Text Area'), {
      key: 'Enter',
      code: 'Enter',
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not submit on Shift+Enter in enter-sends mode', () => {
    const onSubmit = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        onSubmit={onSubmit}
        placeholder="Text Area"
        submitMode="enter-sends"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    fireEvent.keyDown(screen.getByPlaceholderText('Text Area'), {
      key: 'Enter',
      code: 'Enter',
      shiftKey: true,
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits on Ctrl+Enter in mod-enter-sends mode', () => {
    const onSubmit = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        onSubmit={onSubmit}
        placeholder="Text Area"
        submitMode="mod-enter-sends"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    fireEvent.keyDown(screen.getByPlaceholderText('Text Area'), {
      key: 'Enter',
      code: 'Enter',
      ctrlKey: true,
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not submit on plain Enter in mod-enter-sends mode', () => {
    const onSubmit = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        onSubmit={onSubmit}
        placeholder="Text Area"
        submitMode="mod-enter-sends"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    fireEvent.keyDown(screen.getByPlaceholderText('Text Area'), {
      key: 'Enter',
      code: 'Enter',
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows an explicit cancel action while a response is submitting', () => {
    const onCancelSubmit = vi.fn()
    const onSubmit = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        isSubmitting
        onCancelSubmit={onCancelSubmit}
        onSubmit={onSubmit}
        placeholder="Text Area"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    expect(screen.queryByRole('button', { name: 'Send prompt' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel response' }))

    expect(onCancelSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows queued attachment chips and lets the operator remove them before submit', () => {
    const onRemoveAttachment = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        attachments={[
          {
            id: 'att-readme',
            name: 'README.md',
            path: '/repo/README.md',
            mime_type: 'text/markdown',
            size: 2048,
            modified_time: 1_776_800_060,
          },
        ]}
        onRemoveAttachment={onRemoveAttachment}
        placeholder="Text Area"
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    expect(screen.getByText('Attachments')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment README.md' }))

    expect(onRemoveAttachment).toHaveBeenCalledWith('att-readme')
  })

  it('shows recent attachment chips and lets the operator reuse or delete them', () => {
    const onDeleteStoredAttachment = vi.fn()
    const onReuseRecentAttachment = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        onDeleteStoredAttachment={onDeleteStoredAttachment}
        onReuseRecentAttachment={onReuseRecentAttachment}
        placeholder="Text Area"
        recentAttachments={[
          {
            id: 'att-notes',
            name: 'notes.txt',
            path: '/repo/notes.txt',
            mime_type: 'text/plain',
            size: 512,
            modified_time: 1_776_800_061,
          },
        ]}
        toolbarLabel="TOOL BAR"
        value="test"
      />,
    )

    expect(screen.getByText('Recent attachments')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Reuse attachment notes.txt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete stored attachment notes.txt' }))

    expect(onReuseRecentAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'att-notes',
        name: 'notes.txt',
      }),
    )
    expect(onDeleteStoredAttachment).toHaveBeenCalledWith('att-notes')
  })

  it('shows context summary in the toolbar and exposes quick actions for the active widget', () => {
    const onContextUseCurrentWidget = vi.fn()
    const onContextOnlyUseCurrentWidget = vi.fn()
    const onContextUseAllWidgets = vi.fn()
    const onContextUseDefault = vi.fn()

    render(
      <AiComposerWidget
        availableModels={['gpt-5.4']}
        availableProviders={[{ value: 'lan-http', label: 'LAN OpenAI Source' }]}
        activeContextWidgetID="term-main"
        activeContextWidgetOption={{
          value: 'term-main',
          label: 'Main Shell (term-main) · terminal · local',
          title: 'Main Shell',
          group: 'Terminal widgets',
          meta: 'term-main · terminal · local',
        }}
        activeTool="Chat"
        contextWidgetOptions={[
          {
            value: 'term-main',
            label: 'Main Shell (term-main) · terminal · local',
            title: 'Main Shell',
            group: 'Terminal widgets',
            meta: 'term-main · terminal · local',
          },
          {
            value: 'term-side',
            label: 'Ops Shell (term-side) · terminal · local',
            title: 'Ops Shell',
            group: 'Terminal widgets',
            meta: 'term-side · terminal · local',
          },
          {
            value: 'cmd-main',
            label: 'Files (cmd-main) · commander · local',
            title: 'Files',
            group: 'Commander widgets',
            meta: 'cmd-main · commander · local',
          },
        ]}
        onContextUseDefault={onContextUseDefault}
        onContextOnlyUseCurrentWidget={onContextOnlyUseCurrentWidget}
        onContextUseCurrentWidget={onContextUseCurrentWidget}
        onContextUseAllWidgets={onContextUseAllWidgets}
        placeholder="Text Area"
        selectedContextWidgetIDs={['term-side']}
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    expect(screen.getByRole('combobox', { name: 'AI provider' })).toHaveValue('lan-http')
    expect(screen.getByRole('combobox', { name: 'AI model' })).toHaveValue('gpt-5.4')
    expect(screen.getByRole('button', { name: 'Composer options' })).toHaveTextContent('Ops Shell')

    fireEvent.click(screen.getByRole('button', { name: 'Composer options' }))

    const contextDialog = screen.getByRole('dialog', { name: 'Context widgets' })

    expect(contextDialog).toHaveTextContent('Current')
    expect(contextDialog).toHaveTextContent('Main Shell · term-main · terminal · local')
    expect(contextDialog).toHaveTextContent('Selected')
    expect(contextDialog).toHaveTextContent('Terminal widgets')
    expect(contextDialog).toHaveTextContent('Commander widgets')

    fireEvent.click(screen.getByRole('button', { name: 'Use current' }))
    fireEvent.click(screen.getByRole('button', { name: 'Only current' }))
    fireEvent.click(screen.getByRole('button', { name: 'All widgets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use default' }))

    expect(onContextUseCurrentWidget).toHaveBeenCalledTimes(1)
    expect(onContextOnlyUseCurrentWidget).toHaveBeenCalledTimes(1)
    expect(onContextUseAllWidgets).toHaveBeenCalledTimes(1)
    expect(onContextUseDefault).toHaveBeenCalledTimes(1)
  })

  it('shows backend agent profile role and mode selectors', () => {
    const onProfileChange = vi.fn()
    const onRoleChange = vi.fn()
    const onModeChange = vi.fn()

    render(
      <AiComposerWidget
        activeTool="Chat"
        availableModes={[
          { value: 'execute', label: 'Execute' },
          { value: 'review', label: 'Review' },
        ]}
        availableProfiles={[
          { value: 'default', label: 'Default' },
          { value: 'hardened', label: 'Hardened' },
        ]}
        availableRoles={[
          { value: 'developer', label: 'Developer' },
          { value: 'reviewer', label: 'Reviewer' },
        ]}
        onModeChange={onModeChange}
        onProfileChange={onProfileChange}
        onRoleChange={onRoleChange}
        placeholder="Text Area"
        selectedModeID="execute"
        selectedProfileID="default"
        selectedRoleID="developer"
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Agent tuning' }))

    expect(screen.getByRole('dialog', { name: 'Agent tuning' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Agent profile' })).toHaveValue('default')
    expect(screen.getByRole('combobox', { name: 'Agent role' })).toHaveValue('developer')
    expect(screen.getByRole('combobox', { name: 'Agent mode' })).toHaveValue('execute')

    fireEvent.change(screen.getByRole('combobox', { name: 'Agent profile' }), {
      target: { value: 'hardened' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Agent role' }), {
      target: { value: 'reviewer' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Agent mode' }), {
      target: { value: 'review' },
    })

    expect(onProfileChange).toHaveBeenCalledWith('hardened')
    expect(onRoleChange).toHaveBeenCalledWith('reviewer')
    expect(onModeChange).toHaveBeenCalledWith('review')
  })

  it('localizes built-in agent mode labels without changing selected ids', () => {
    render(
      <AiComposerWidget
        activeTool="Chat"
        availableModes={[
          { value: 'implement', label: 'Implement' },
          { value: 'review', label: 'Review' },
        ]}
        locale="ru"
        placeholder="Text Area"
        selectedModeID="implement"
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Agent tuning' }))

    const modeSelect = screen.getByRole('combobox', { name: 'Agent mode' })
    expect(modeSelect).toHaveValue('implement')
    expect(screen.getByRole('option', { name: 'Реализация' })).toHaveValue('implement')
    expect(screen.getByRole('option', { name: 'Ревью' })).toHaveValue('review')
  })

  it('shows selected context chips and lets the operator remove a widget without reopening the dropdown', () => {
    const onSelectedContextWidgetIDsChange = vi.fn()

    render(
      <AiComposerWidget
        activeContextWidgetID="term-main"
        activeContextWidgetOption={{
          value: 'term-main',
          label: 'Main Shell (term-main) · terminal · local',
          title: 'Main Shell',
          meta: 'term-main · terminal · local',
        }}
        activeTool="Chat"
        contextWidgetOptions={[
          {
            value: 'term-main',
            label: 'Main Shell (term-main) · terminal · local',
            title: 'Main Shell',
            meta: 'term-main · terminal · local',
          },
          {
            value: 'term-side',
            label: 'Ops Shell (term-side) · terminal · local',
            title: 'Ops Shell',
            meta: 'term-side · terminal · local',
          },
        ]}
        onSelectedContextWidgetIDsChange={onSelectedContextWidgetIDsChange}
        placeholder="Text Area"
        selectedContextWidgetIDs={['term-main', 'term-side']}
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    expect(screen.getByText('Request context')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove Main Shell from request context' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove Ops Shell from request context' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Ops Shell from request context' }))

    expect(onSelectedContextWidgetIDsChange).toHaveBeenCalledWith(['term-main'])
  })

  it('keeps the expanded composer compact with a two-column control grid', () => {
    const { container } = render(
      <AiComposerWidget
        activeContextWidgetID="term-main"
        activeContextWidgetOption={{
          value: 'term-main',
          label: 'Main Shell (term-main) · terminal · local',
          title: 'Main Shell',
          meta: 'term-main · terminal · local',
        }}
        activeTool="Chat"
        availableModels={['gpt-5.4']}
        availableModes={[
          { value: 'implement', label: 'Implement' },
          { value: 'review', label: 'Review' },
        ]}
        availableProfiles={[
          { value: 'balanced', label: 'Balanced' },
          { value: 'hardened', label: 'Hardened' },
        ]}
        availableProviders={[{ value: 'codex-cli', label: 'Codex CLI' }]}
        availableRoles={[
          { value: 'developer', label: 'Developer' },
          { value: 'reviewer', label: 'Reviewer' },
        ]}
        contextWidgetOptions={[
          {
            value: 'term-main',
            label: 'Main Shell (term-main) · terminal · local',
            title: 'Main Shell',
            meta: 'term-main · terminal · local',
          },
        ]}
        placeholder="Text Area"
        selectedContextWidgetIDs={['term-main']}
        selectedModeID="implement"
        selectedModel="gpt-5.4"
        selectedProfileID="balanced"
        selectedProviderID="codex-cli"
        selectedRoleID="developer"
        toolbarLabel="TOOL BAR"
        value="draft"
      />,
    )

    const toolbar = container.querySelector('[data-runa-ai-composer-toolbar]')
    const controlGrid = container.querySelector('[data-runa-ai-composer-control-grid]')
    const surface = container.querySelector('[data-runa-ai-composer-surface]')
    const textarea = screen.getByPlaceholderText('Text Area')

    expect(toolbar).not.toBeNull()
    expect(controlGrid).not.toBeNull()
    expect(surface).not.toBeNull()
    expect(controlGrid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    })
    expect(surface?.getAttribute('style') ?? '').toContain('display: flex;')
    expect(surface?.getAttribute('style') ?? '').toContain('min-height: 140px;')
    expect(surface?.getAttribute('style') ?? '').toContain('background: var(--color-canvas-elevated);')
    expect(textarea.getAttribute('style') ?? '').toContain('font-size: 15px;')
    expect(textarea.getAttribute('style') ?? '').toContain('line-height: 22px;')
    expect(screen.getByRole('button', { name: 'Agent tuning' })).toHaveTextContent('balanced · developer')
    expect(screen.getByRole('button', { name: 'Composer options' })).toHaveTextContent('Main Shell')
  })

  it('shows a repair notice when saved context widgets are missing and persists the cleaned selection', () => {
    const onRepairMissingContextWidgets = vi.fn()

    render(
      <AiComposerWidget
        activeContextWidgetID="term-main"
        activeContextWidgetOption={{
          value: 'term-main',
          label: 'Main Shell (term-main) · terminal · local',
          title: 'Main Shell',
          meta: 'term-main · terminal · local',
        }}
        activeTool="Chat"
        contextWidgetOptions={[
          {
            value: 'term-main',
            label: 'Main Shell (term-main) · terminal · local',
            title: 'Main Shell',
            meta: 'term-main · terminal · local',
          },
        ]}
        missingContextWidgetCount={2}
        onRepairMissingContextWidgets={onRepairMissingContextWidgets}
        placeholder="Text Area"
        selectedContextWidgetIDs={['term-main']}
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    expect(screen.getByText('2 saved widgets are no longer available in this workspace.')).toBeVisible()
    fireEvent.click(screen.getAllByRole('button', { name: 'Save cleaned context' })[0]!)
    expect(onRepairMissingContextWidgets).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Composer options' }))

    expect(
      screen.getAllByText('2 saved widgets are no longer available in this workspace.').length,
    ).toBeGreaterThanOrEqual(1)

    fireEvent.click(screen.getByRole('button', { name: 'Save cleaned context' }))

    expect(onRepairMissingContextWidgets).toHaveBeenCalledTimes(2)
  })
})
