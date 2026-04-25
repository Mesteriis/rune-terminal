import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { listFilesDirectory, openFilesPathExternally } from '@/features/files/api/client'
import { FilesPanelWidget } from './files-panel-widget'

vi.mock('@/features/files/api/client', () => ({
  listFilesDirectory: vi.fn(),
  openFilesPathExternally: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function expectTextBefore(leftText: string, rightText: string) {
  const leftNode = screen.getByText(leftText)
  const rightNode = screen.getByText(rightText)

  expect(leftNode.compareDocumentPosition(rightNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

describe('FilesPanelWidget', () => {
  it('loads and renders a backend directory listing', async () => {
    vi.mocked(listFilesDirectory).mockResolvedValue({
      entries: [
        {
          id: '/repo::src',
          kind: 'directory',
          modified: '2026-04-25 20:00',
          modifiedTime: 1_776_800_000,
          name: 'src',
          sizeBytes: 0,
          sizeLabel: '',
        },
        {
          id: '/repo::README.md',
          kind: 'file',
          modified: '2026-04-25 20:01',
          modifiedTime: 1_776_800_060,
          name: 'README.md',
          sizeBytes: 2048,
          sizeLabel: '2.0 KB',
        },
      ],
      path: '/repo',
    })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    expect(screen.getByText('Loading directory')).toBeInTheDocument()

    await waitFor(() => {
      expect(listFilesDirectory).toHaveBeenCalledWith('/repo')
      expect(screen.getByText('src')).toBeInTheDocument()
      expect(screen.getByText('README.md')).toBeInTheDocument()
      expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    })
  })

  it('renders backend listing errors inline', async () => {
    vi.mocked(listFilesDirectory).mockRejectedValue(new Error('policy denied'))

    render(<FilesPanelWidget path="/private" title="private" />)

    await expect(screen.findByText('policy denied')).resolves.toBeInTheDocument()
  })

  it('navigates into child directories and back to the parent path', async () => {
    vi.mocked(listFilesDirectory).mockImplementation(async (path) => {
      if (path === '/repo/src') {
        return {
          entries: [
            {
              id: '/repo/src::index.ts',
              kind: 'file',
              modified: '2026-04-25 20:02',
              modifiedTime: 1_776_800_120,
              name: 'index.ts',
              sizeBytes: 512,
              sizeLabel: '512 B',
            },
          ],
          path,
        }
      }

      return {
        entries: [
          {
            id: '/repo::src',
            kind: 'directory',
            modified: '2026-04-25 20:00',
            modifiedTime: 1_776_800_000,
            name: 'src',
            sizeBytes: 0,
            sizeLabel: '',
          },
        ],
        path: '/repo',
      }
    })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open directory src' }))

    await waitFor(() => {
      expect(listFilesDirectory).toHaveBeenCalledWith('/repo/src')
      expect(screen.getByText('/repo/src')).toBeInTheDocument()
      expect(screen.getByText('index.ts')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open parent directory' }))

    await waitFor(() => {
      expect(listFilesDirectory).toHaveBeenCalledWith('/repo')
      expect(screen.getByText('/repo')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Open directory src' })).toBeInTheDocument()
    })
  })

  it('filters visible entries by filename and clears the filter', async () => {
    vi.mocked(listFilesDirectory).mockResolvedValue({
      entries: [
        {
          id: '/repo::src',
          kind: 'directory',
          modified: '2026-04-25 20:00',
          modifiedTime: 1_776_800_000,
          name: 'src',
          sizeBytes: 0,
          sizeLabel: '',
        },
        {
          id: '/repo::package.json',
          kind: 'file',
          modified: '2026-04-25 20:03',
          modifiedTime: 1_776_800_180,
          name: 'package.json',
          sizeBytes: 1024,
          sizeLabel: '1.0 KB',
        },
      ],
      path: '/repo',
    })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    await screen.findByRole('button', { name: 'Open directory src' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter files' }), {
      target: { value: 'package' },
    })

    expect(screen.queryByRole('button', { name: 'Open directory src' })).not.toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear files filter' }))

    expect(screen.getByRole('button', { name: 'Open directory src' })).toBeInTheDocument()
  })

  it('refreshes the current directory on demand', async () => {
    vi.mocked(listFilesDirectory)
      .mockResolvedValueOnce({
        entries: [],
        path: '/repo',
      })
      .mockResolvedValueOnce({
        entries: [
          {
            id: '/repo::new-file.txt',
            kind: 'file',
            modified: '2026-04-25 20:04',
            modifiedTime: 1_776_800_240,
            name: 'new-file.txt',
            sizeBytes: 4,
            sizeLabel: '4 B',
          },
        ],
        path: '/repo',
      })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    await expect(screen.findByText('Directory is empty')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh directory' }))

    await waitFor(() => {
      expect(listFilesDirectory).toHaveBeenCalledTimes(2)
      expect(screen.getByText('new-file.txt')).toBeInTheDocument()
    })
  })

  it('sorts the current listing by file metadata', async () => {
    vi.mocked(listFilesDirectory).mockResolvedValue({
      entries: [
        {
          id: '/repo::zeta',
          kind: 'directory',
          modified: '2026-04-25 20:00',
          modifiedTime: 1_776_800_000,
          name: 'zeta',
          sizeBytes: 0,
          sizeLabel: '',
        },
        {
          id: '/repo::alpha',
          kind: 'directory',
          modified: '2026-04-25 20:01',
          modifiedTime: 1_776_800_060,
          name: 'alpha',
          sizeBytes: 0,
          sizeLabel: '',
        },
        {
          id: '/repo::small.txt',
          kind: 'file',
          modified: '2026-04-25 20:02',
          modifiedTime: 1_776_800_120,
          name: 'small.txt',
          sizeBytes: 10,
          sizeLabel: '10 B',
        },
        {
          id: '/repo::large.txt',
          kind: 'file',
          modified: '2026-04-25 20:03',
          modifiedTime: 1_776_800_180,
          name: 'large.txt',
          sizeBytes: 200,
          sizeLabel: '200 B',
        },
      ],
      path: '/repo',
    })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    await screen.findByRole('button', { name: 'Open directory alpha' })

    expectTextBefore('alpha', 'zeta')

    fireEvent.click(screen.getByRole('button', { name: 'Sort files by size' }))

    expectTextBefore('large.txt', 'small.txt')

    fireEvent.click(screen.getByRole('button', { name: 'Sort files by size' }))

    expectTextBefore('small.txt', 'large.txt')
  })

  it('opens files through the runtime external opener route', async () => {
    vi.mocked(listFilesDirectory).mockResolvedValue({
      entries: [
        {
          id: '/repo::README.md',
          kind: 'file',
          modified: '2026-04-25 20:01',
          modifiedTime: 1_776_800_060,
          name: 'README.md',
          sizeBytes: 2048,
          sizeLabel: '2.0 KB',
        },
      ],
      path: '/repo',
    })
    vi.mocked(openFilesPathExternally).mockResolvedValue({
      path: '/repo/README.md',
    })

    render(<FilesPanelWidget path="/repo" title="repo" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open file README.md' }))

    await waitFor(() => {
      expect(openFilesPathExternally).toHaveBeenCalledWith('/repo/README.md')
      expect(screen.getByText('Open request sent for README.md')).toBeInTheDocument()
    })
  })
})
