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
        sizeBytes={6}
      />,
    )

    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
    expect(screen.getByText('Preview unavailable for this file')).toBeInTheDocument()
    expect(
      screen.getByText('File is binary or not UTF-8 text. Open it with an external tool.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Binary file size: 6 B. Use F3 for bounded hex preview.')).toBeInTheDocument()
    expect(screen.getByText('Binary file · 6 B')).toBeInTheDocument()
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
        previewBytes={6}
        previewKind="hex"
        sizeBytes={6}
        truncated={false}
      />,
    )

    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
    expect(screen.getByText('Edit unavailable for this file')).toBeInTheDocument()
    expect(
      screen.getByText('File is not UTF-8 text. Use F3 for preview or open it with an external tool.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Binary file size: 6 B. Use F3 for bounded hex preview.')).toBeInTheDocument()
    expect(screen.getByText('Binary file · 6 B · Previewing 6 B')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('surfaces file and containing-folder external open actions for blocked and hex preview flows', async () => {
    const onOpenExternalFile = vi.fn().mockResolvedValue(undefined)
    const onOpenExternalFolder = vi.fn().mockResolvedValue(undefined)

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
        onOpenExternalFile={onOpenExternalFile}
        onOpenExternalFolder={onOpenExternalFolder}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open file' }))

    expect(onOpenExternalFile).toHaveBeenCalledTimes(1)
    expect(await screen.findAllByText('File open request sent to the system opener.')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Open containing folder' }))

    expect(onOpenExternalFolder).toHaveBeenCalledTimes(1)
    expect(
      await screen.findAllByText('Containing folder open request sent to the system opener.'),
    ).not.toHaveLength(0)
  })

  it('shows an inline error when external file open fails', async () => {
    const onOpenExternalFile = vi.fn().mockRejectedValue(new Error('Unable to open file externally.'))

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
        onOpenExternalFile={onOpenExternalFile}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open file' }))

    expect(await screen.findAllByText('Unable to open file externally.')).not.toHaveLength(0)
  })

  it('shows an inline error when external folder open fails', async () => {
    const onOpenExternalFolder = vi
      .fn()
      .mockRejectedValue(new Error('Unable to open containing folder externally.'))

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
        onOpenExternalFolder={onOpenExternalFolder}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open containing folder' }))

    expect(await screen.findAllByText('Unable to open containing folder externally.')).not.toHaveLength(0)
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
        onOpenExternalFile={vi.fn()}
        onOpenExternalFolder={vi.fn()}
        onSave={vi.fn()}
        previewBytes={4}
        previewKind="hex"
        sizeBytes={4}
        truncated={false}
      />,
    )

    expect(screen.getByText('VIEW')).toBeInTheDocument()
    expect(screen.getByText('HEX')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'View binary.dat' })).toHaveValue(
      '00000000  00 01 02 03                                      |....|',
    )
    expect(screen.getByText('Binary file · 4 B · Previewing 4 B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open file' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open containing folder' })).toBeInTheDocument()
  })
})
