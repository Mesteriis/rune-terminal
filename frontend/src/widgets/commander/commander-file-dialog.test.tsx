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

  it('surfaces the external open action for blocked and hex preview flows', async () => {
    const onOpenExternal = vi.fn().mockResolvedValue(undefined)

    render(
      <CommanderFileDialog
        blockedReason="File is binary or not UTF-8 text. Open it with an external tool."
        content=""
        dirty={false}
        entryName="binary.dat"
        entryPath="/workspace/tmp/binary.dat"
        mode="blocked"
        onChange={vi.fn()}
        onClose={vi.fn()}
        onOpenExternal={onOpenExternal}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open externally' }))

    expect(onOpenExternal).toHaveBeenCalledTimes(1)
    expect(await screen.findAllByText('Open request sent to the system opener.')).not.toHaveLength(0)
  })

  it('shows an inline error when external open fails', async () => {
    const onOpenExternal = vi.fn().mockRejectedValue(new Error('Unable to open file externally.'))

    render(
      <CommanderFileDialog
        blockedReason="File is binary or not UTF-8 text. Open it with an external tool."
        content=""
        dirty={false}
        entryName="binary.dat"
        entryPath="/workspace/tmp/binary.dat"
        mode="blocked"
        onChange={vi.fn()}
        onClose={vi.fn()}
        onOpenExternal={onOpenExternal}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open externally' }))

    expect(await screen.findAllByText('Unable to open file externally.')).not.toHaveLength(0)
  })

  it('renders a read-only hex preview for binary file views', () => {
    render(
      <CommanderFileDialog
        content="00000000  00 01 02 03                                      |....|"
        dirty={false}
        entryName="binary.dat"
        entryPath="/workspace/tmp/binary.dat"
        mode="view"
        onChange={vi.fn()}
        onClose={vi.fn()}
        onOpenExternal={vi.fn()}
        onSave={vi.fn()}
        previewKind="hex"
      />,
    )

    expect(screen.getByText('VIEW')).toBeInTheDocument()
    expect(screen.getByText('HEX')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'View binary.dat' })).toHaveValue(
      '00000000  00 01 02 03                                      |....|',
    )
    expect(screen.getByText('Read only hex preview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open externally' })).toBeInTheDocument()
  })
})
