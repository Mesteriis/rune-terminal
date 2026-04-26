import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { readPreviewFile } from '@/features/preview/api/client'
import { PreviewPanelWidget } from './preview-panel-widget'

vi.mock('@/features/preview/api/client', () => ({
  readPreviewFile: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('PreviewPanelWidget', () => {
  it('loads and renders a text preview', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })

    render(<PreviewPanelWidget path="/repo/README.md" title="README.md" />)

    expect(screen.getByText('Loading preview')).toBeInTheDocument()

    await waitFor(() => {
      expect(readPreviewFile).toHaveBeenCalledWith('/repo/README.md', { maxBytes: 65_536 })
      expect(screen.getByText('# Readme')).toBeInTheDocument()
      expect(screen.getByText('Text preview · 8 B')).toBeInTheDocument()
    })
  })

  it('renders hex previews and truncated state metadata', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '00000000  00 01 02 03                                      |....|',
      path: '/repo/blob.bin',
      previewBytes: 4,
      previewKind: 'hex',
      sizeBytes: 1024,
      truncated: true,
    })

    render(<PreviewPanelWidget path="/repo/blob.bin" title="blob.bin" />)

    await expect(screen.findByText(/00000000/)).resolves.toBeInTheDocument()
    expect(screen.getByText('Hex preview · 1.0 KB · truncated')).toBeInTheDocument()
  })

  it('refreshes the current preview on demand', async () => {
    vi.mocked(readPreviewFile)
      .mockResolvedValueOnce({
        content: 'before',
        path: '/repo/notes.txt',
        previewBytes: 6,
        previewKind: 'text',
        sizeBytes: 6,
        truncated: false,
      })
      .mockResolvedValueOnce({
        content: 'after',
        path: '/repo/notes.txt',
        previewBytes: 5,
        previewKind: 'text',
        sizeBytes: 5,
        truncated: false,
      })

    render(<PreviewPanelWidget path="/repo/notes.txt" title="notes.txt" />)

    await expect(screen.findByText('before')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh preview' }))

    await waitFor(() => {
      expect(readPreviewFile).toHaveBeenCalledTimes(2)
      expect(screen.getByText('after')).toBeInTheDocument()
    })
  })

  it('renders preview load errors inline', async () => {
    vi.mocked(readPreviewFile).mockRejectedValue(new Error('preview denied'))

    render(<PreviewPanelWidget path="/private/notes.txt" title="notes.txt" />)

    await expect(screen.findByText('preview denied')).resolves.toBeInTheDocument()
  })
})
