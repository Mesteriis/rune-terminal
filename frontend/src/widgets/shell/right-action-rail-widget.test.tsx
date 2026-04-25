import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTerminalTab } from '@/features/terminal/api/client'
import { type WorkspaceWidgetCatalogState } from '@/features/workspace/model/widget-catalog'
import { RightActionRailWidget } from '@/widgets/shell/right-action-rail-widget'

vi.mock('@/features/terminal/api/client', () => ({
  createTerminalTab: vi.fn(),
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
        description: 'Future preview',
        status: 'planned',
        runtime_owned: false,
        can_create: false,
        supports_connections: false,
        supports_path: true,
        default_title: 'Preview',
      },
    ],
    status: 'ready',
  }
}

function renderRail(widgetCatalog = createWidgetCatalog()) {
  const dockviewApi = {
    activePanel: {
      id: 'terminal',
    },
    addPanel: vi.fn(),
    getPanel: vi.fn((_panelId: string) => null),
  }
  const onAddWorkspace = vi.fn()

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
    expect(
      screen.getByRole('menuitem', { name: 'Files widget unavailable: Requires path handoff' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('menuitem', { name: 'Commander widget unavailable: Frontend-local' }),
    ).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Preview widget unavailable: Planned' })).toBeDisabled()
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
})
