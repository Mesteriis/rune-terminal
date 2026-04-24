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
})
