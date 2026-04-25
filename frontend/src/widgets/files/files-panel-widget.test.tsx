import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { listFilesDirectory } from '@/features/files/api/client'
import { FilesPanelWidget } from './files-panel-widget'

vi.mock('@/features/files/api/client', () => ({
  listFilesDirectory: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('FilesPanelWidget', () => {
  it('loads and renders a backend directory listing', async () => {
    vi.mocked(listFilesDirectory).mockResolvedValue({
      entries: [
        {
          id: '/repo::src',
          kind: 'directory',
          modified: '2026-04-25 20:00',
          name: 'src',
          sizeLabel: '',
        },
        {
          id: '/repo::README.md',
          kind: 'file',
          modified: '2026-04-25 20:01',
          name: 'README.md',
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
              name: 'index.ts',
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
            name: 'src',
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
})
