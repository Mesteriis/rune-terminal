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

  it('shows context summary in the toolbar and exposes quick actions for the active widget', () => {
    const onContextUseCurrentWidget = vi.fn()
    const onContextOnlyUseCurrentWidget = vi.fn()

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
        onContextOnlyUseCurrentWidget={onContextOnlyUseCurrentWidget}
        onContextUseCurrentWidget={onContextUseCurrentWidget}
        placeholder="Text Area"
        selectedContextWidgetIDs={['term-side']}
        toolbarLabel="TOOL BAR"
        value=""
      />,
    )

    expect(screen.getByRole('button', { name: 'Composer options' })).toHaveTextContent('Context')
    expect(screen.getByRole('button', { name: 'Composer options' })).toHaveTextContent('Ops Shell')

    fireEvent.click(screen.getByRole('button', { name: 'Composer options' }))

    const contextDialog = screen.getByRole('dialog', { name: 'Context widgets' })

    expect(contextDialog).toHaveTextContent('Current')
    expect(contextDialog).toHaveTextContent('Main Shell · term-main · terminal · local')
    expect(contextDialog).toHaveTextContent('Selected')

    fireEvent.click(screen.getByRole('button', { name: 'Use current' }))
    fireEvent.click(screen.getByRole('button', { name: 'Only current' }))

    expect(onContextUseCurrentWidget).toHaveBeenCalledTimes(1)
    expect(onContextOnlyUseCurrentWidget).toHaveBeenCalledTimes(1)
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
})
