import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CommanderFileDialog } from '@/widgets/commander/commander-file-dialog'

describe('CommanderFileDialog', () => {
  it('renders an explicit blocked shell for non-text preview attempts', () => {
    const onClose = vi.fn()

    render(
      <CommanderFileDialog
        blockedHint="Binary preview unavailable"
        blockedReason="File is binary or not UTF-8 text. Open it with an external tool."
        blockedTitle="Preview unavailable for this file"
        content=""
        dirty={false}
        entryName="binary.dat"
        entryPath="/workspace/tmp/binary.dat"
        mode="blocked"
        onChange={vi.fn()}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
    expect(screen.getByText('Preview unavailable for this file')).toBeInTheDocument()
    expect(
      screen.getByText('File is binary or not UTF-8 text. Open it with an external tool.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Binary preview unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders an explicit blocked shell for non-text edit attempts', () => {
    const onClose = vi.fn()

    render(
      <CommanderFileDialog
        blockedReason="File is not UTF-8 text. Use F3 for preview or open it with an external tool."
        content=""
        dirty={false}
        entryName="binary.dat"
        entryPath="/workspace/tmp/binary.dat"
        mode="blocked"
        onChange={vi.fn()}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
    expect(screen.getByText('Edit unavailable for this file')).toBeInTheDocument()
    expect(
      screen.getByText('File is not UTF-8 text. Use F3 for preview or open it with an external tool.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
