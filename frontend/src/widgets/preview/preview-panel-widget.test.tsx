import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { openPreviewPathExternally, readPreviewFile } from '@/features/preview/api/client'
import { writeTextToClipboard } from '@/shared/model/clipboard'
import { PreviewPanelWidget } from './preview-panel-widget'

vi.mock('@/features/preview/api/client', () => ({
  openPreviewPathExternally: vi.fn(),
  readPreviewFile: vi.fn(),
}))

vi.mock('@/shared/model/clipboard', () => ({
  writeTextToClipboard: vi.fn(),
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

  it('uses connection-aware preview reads for SSH-backed preview widgets', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Remote',
      path: '/remote/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })

    render(<PreviewPanelWidget connectionId="conn-ssh" path="/remote/README.md" title="README.md" />)

    await waitFor(() => {
      expect(readPreviewFile).toHaveBeenCalledWith('/remote/README.md', {
        connectionId: 'conn-ssh',
        maxBytes: 65_536,
      })
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

  it('renders CSV text previews as bounded tables', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: 'name,count\nalpha,1\nbeta,2',
      path: '/repo/data.csv',
      previewBytes: 25,
      previewKind: 'text',
      sizeBytes: 25,
      truncated: false,
    })

    render(<PreviewPanelWidget path="/repo/data.csv" title="data.csv" />)

    await expect(screen.findByRole('columnheader', { name: 'name' })).resolves.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'count' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'alpha' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument()
    expect(screen.getByText('CSV table preview · 25 B')).toBeInTheDocument()
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

  it('opens the preview file through the backend external opener', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    vi.mocked(openPreviewPathExternally).mockResolvedValue({
      path: '/repo/README.md',
    })

    render(<PreviewPanelWidget path="/repo/README.md" title="README.md" />)

    await expect(screen.findByText('# Readme')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open preview file externally' }))

    await waitFor(() => {
      expect(openPreviewPathExternally).toHaveBeenCalledWith('/repo/README.md')
      expect(screen.getByText('Preview file open request sent to the system opener.')).toBeInTheDocument()
    })
  })

  it('uses connection-aware external-open requests for SSH-backed preview widgets', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Remote',
      path: '/remote/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    vi.mocked(openPreviewPathExternally).mockResolvedValue({
      path: '/remote/README.md',
    })

    render(<PreviewPanelWidget connectionId="conn-ssh" path="/remote/README.md" title="README.md" />)

    await expect(screen.findByText('# Remote')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open preview file externally' }))

    await waitFor(() => {
      expect(openPreviewPathExternally).toHaveBeenCalledWith('/remote/README.md', {
        connectionId: 'conn-ssh',
      })
    })
  })

  it('opens the preview containing folder through the backend external opener', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    vi.mocked(openPreviewPathExternally).mockResolvedValue({
      path: '/repo',
    })

    render(<PreviewPanelWidget path="/repo/README.md" title="README.md" />)

    await expect(screen.findByText('# Readme')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open preview containing folder externally' }))

    await waitFor(() => {
      expect(openPreviewPathExternally).toHaveBeenCalledWith('/repo')
      expect(
        screen.getByText('Preview containing folder open request sent to the system opener.'),
      ).toBeInTheDocument()
    })
  })

  it('copies the preview file path to the browser clipboard', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    vi.mocked(writeTextToClipboard).mockResolvedValue(undefined)

    render(<PreviewPanelWidget path="/repo/README.md" title="README.md" />)

    await expect(screen.findByText('# Readme')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy preview file path' }))

    await waitFor(() => {
      expect(writeTextToClipboard).toHaveBeenCalledWith('/repo/README.md')
      expect(screen.getByText('Copied preview file path to clipboard.')).toBeInTheDocument()
    })
  })

  it('renders external-open errors inline', async () => {
    vi.mocked(readPreviewFile).mockResolvedValue({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    vi.mocked(openPreviewPathExternally).mockRejectedValue(new Error('opener denied'))

    render(<PreviewPanelWidget path="/repo/README.md" title="README.md" />)

    await expect(screen.findByText('# Readme')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open preview file externally' }))

    await waitFor(() => {
      expect(screen.getByText('opener denied')).toBeInTheDocument()
    })
  })

  it('renders preview load errors inline', async () => {
    vi.mocked(readPreviewFile).mockRejectedValue(new Error('preview denied'))

    render(<PreviewPanelWidget path="/private/notes.txt" title="notes.txt" />)

    await expect(screen.findByText('preview denied')).resolves.toBeInTheDocument()
  })
})
