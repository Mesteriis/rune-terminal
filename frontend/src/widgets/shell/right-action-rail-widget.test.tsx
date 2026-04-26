import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createTerminalTab,
  fetchTerminalSessionCatalog,
  setActiveTerminalSession,
} from '@/features/terminal/api/client'
import { type WorkspaceWidgetCatalogState } from '@/features/workspace/model/widget-catalog'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import { focusWorkspaceWidget, openDirectoryWorkspaceWidget } from '@/shared/api/workspace'
import { RightActionRailWidget } from '@/widgets/shell/right-action-rail-widget'

vi.mock('@/features/terminal/api/client', () => ({
  createTerminalTab: vi.fn(),
  fetchTerminalSessionCatalog: vi.fn(),
  restartTerminal: vi.fn(),
  setActiveTerminalSession: vi.fn(),
}))

vi.mock('@/shared/api/runtime', () => ({
  resolveRuntimeContext: vi.fn(),
}))

vi.mock('@/shared/api/workspace', () => ({
  focusWorkspaceWidget: vi.fn(),
  openDirectoryWorkspaceWidget: vi.fn(),
}))

vi.mock('@/app/ensure-ai-terminal-visibility', () => ({
  ensureAiTerminalVisibility: vi.fn(async () => ({ widgetId: 'term-main' })),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function createWidgetCatalog(): WorkspaceWidgetCatalogState {
  return {
    entries: [
      {
        kind: 'terminal',
        label: 'Terminal',
        description: 'Backend terminal',
        status: 'available',
        runtime_owned: true,
        can_create: true,
        supports_connections: true,
        supports_path: false,
        default_title: 'Terminal',
      },
      {
        kind: 'files',
        label: 'Files',
        description: 'Backend directory view',
        status: 'available',
        runtime_owned: true,
        can_create: true,
        supports_connections: true,
        supports_path: true,
        default_title: 'Files',
      },
      {
        kind: 'commander',
        label: 'Commander',
        description: 'Frontend local commander',
        status: 'frontend-local',
        runtime_owned: false,
        can_create: false,
        supports_connections: false,
        supports_path: false,
        default_title: 'Commander',
      },
      {
        kind: 'preview',
        label: 'Preview',
        description: 'Backend preview handoff',
        status: 'available',
        runtime_owned: true,
        can_create: false,
        supports_connections: false,
        supports_path: true,
        default_title: 'Preview',
      },
    ],
    status: 'ready',
  }
}

function defaultTerminalSessionCatalog() {
  return {
    active_workspace_id: 'ws-local',
    sessions: [
      {
        workspace_id: 'ws-local',
        workspace_name: 'Local Workspace',
        tab_id: 'tab-main',
        tab_title: 'Main Shell',
        widget_id: 'term-main',
        widget_title: 'Main Shell',
        session_id: 'term-main',
        connection_kind: 'local',
        connection_name: 'Local Machine',
        shell: 'zsh',
        status: 'running',
        working_dir: '/repo',
        is_active_workspace: true,
        is_active_tab: true,
        is_active_widget: true,
        is_active_session: true,
      },
    ],
  }
}

function renderRail(widgetCatalog = createWidgetCatalog(), sessionCatalog = defaultTerminalSessionCatalog()) {
  const dockviewApi = {
    activePanel: {
      id: 'terminal',
    },
    addPanel: vi.fn(),
    getPanel: vi.fn((_panelId: string) => null),
  }
  const onAddWorkspace = vi.fn()

  vi.mocked(fetchTerminalSessionCatalog).mockResolvedValue(sessionCatalog)

  render(
    <RightActionRailWidget
      dockviewApiRef={{ current: dockviewApi as never }}
      onAddWorkspace={onAddWorkspace}
      widgetCatalog={widgetCatalog}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Open utility panel' }))

  return {
    dockviewApi,
    onAddWorkspace,
  }
}

describe('RightActionRailWidget', () => {
  it('renders widget actions from the backend catalog and disables non-creatable kinds', () => {
    renderRail()

    expect(screen.getByRole('menuitem', { name: 'Create Terminal widget' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Create Files widget' })).toBeEnabled()
    expect(
      screen.getByRole('menuitem', { name: 'Commander widget unavailable: Frontend-local' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('menuitem', { name: 'Preview widget unavailable: Needs file path' }),
    ).toBeDisabled()
  })

  it('creates catalog-creatable files widgets through an explicit repo-root path handoff', async () => {
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      authToken: 'runtime-token',
      baseUrl: 'http://127.0.0.1:8090',
      colorTerm: '',
      defaultShell: '/bin/zsh',
      homeDir: '/Users/avm',
      repoRoot: '/repo',
      term: 'xterm-256color',
    })
    vi.mocked(openDirectoryWorkspaceWidget).mockResolvedValue({
      tab_id: 'tab-main',
      widget_id: 'files-9',
    })
    const { dockviewApi } = renderRail()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Create Files widget' }))

    await waitFor(() => {
      expect(openDirectoryWorkspaceWidget).toHaveBeenCalledWith({
        path: '/repo',
        targetWidgetId: 'term-side',
      })
      expect(dockviewApi.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'files-9',
          params: expect.objectContaining({
            component: 'files',
            path: '/repo',
            widgetId: 'files-9',
          }),
        }),
      )
    })
  })

  it('creates only catalog-creatable terminal widgets through the runtime path', async () => {
    vi.mocked(createTerminalTab).mockResolvedValue({
      tab_id: 'tab-9',
      widget_id: 'term-9',
      title: 'Workspace shell',
    })
    const { dockviewApi } = renderRail()

    fireEvent.click(screen.getByRole('menuitem', { name: 'Create Terminal widget' }))

    await waitFor(() => {
      expect(createTerminalTab).toHaveBeenCalledWith('Workspace shell')
      expect(dockviewApi.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'terminal',
          params: expect.objectContaining({
            runtimeTabId: 'tab-9',
            widgetId: 'term-9',
          }),
        }),
      )
    })
  })

  it('does not render stale hardcoded widget actions while the catalog is loading', () => {
    renderRail({
      entries: [],
      status: 'loading',
    })

    expect(screen.queryByRole('menuitem', { name: 'Create Terminal widget' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Create Commander widget' })).not.toBeInTheDocument()
  })

  it('renders the global terminal session navigator and focuses a selected session', async () => {
    vi.mocked(setActiveTerminalSession).mockResolvedValue({
      active_session_id: 'term-main',
      chunks: [],
      next_seq: 1,
      sessions: [],
      state: {
        widget_id: 'term-main',
        session_id: 'term-main',
        shell: '/bin/zsh',
        status: 'running',
        pid: 101,
        started_at: '2026-04-27T08:00:00Z',
        can_send_input: true,
        can_interrupt: true,
      },
    })
    vi.mocked(focusWorkspaceWidget).mockResolvedValue({
      workspace: {
        id: 'ws-local',
        name: 'Local Workspace',
        active_widget_id: 'term-main',
        widgets: [],
      },
    })

    renderRail(createWidgetCatalog(), {
      active_workspace_id: 'ws-local',
      sessions: [
        {
          workspace_id: 'ws-local',
          workspace_name: 'Local Workspace',
          tab_id: 'tab-main',
          tab_title: 'Main Shell',
          widget_id: 'term-main',
          widget_title: 'Main Shell',
          session_id: 'term-main',
          connection_kind: 'local',
          connection_name: 'Local Machine',
          shell: 'zsh',
          status: 'running',
          working_dir: '/repo',
          is_active_workspace: true,
          is_active_tab: true,
          is_active_widget: false,
          is_active_session: false,
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getByText('Terminal sessions')).toBeInTheDocument()
      expect(screen.getByText('Local Workspace / Main Shell')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Focus terminal session term-main' }))

    await waitFor(() => {
      expect(setActiveTerminalSession).toHaveBeenCalledWith('term-main', 'term-main')
      expect(focusWorkspaceWidget).toHaveBeenCalledWith('term-main')
    })
  })
})
