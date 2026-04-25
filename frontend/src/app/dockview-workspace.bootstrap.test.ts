import { describe, expect, it, vi } from 'vitest'

import { type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'
import { seedDockviewWorkspaceBootstrap } from './dockview-workspace.bootstrap'

function createDockviewApiMock() {
  const panels = new Map<string, unknown>()
  const addedPanels: unknown[] = []

  return {
    addedPanels,
    api: {
      addPanel: vi.fn((panel: { id: string }) => {
        panels.set(panel.id, panel)
        addedPanels.push(panel)
      }),
      getPanel: vi.fn((panelId: string) => panels.get(panelId) ?? null),
      toJSON: vi.fn(() => ({ panels: addedPanels })),
    },
  }
}

function createCatalog(
  overrides: Partial<Record<string, Partial<WorkspaceWidgetKindCatalogEntry>>> = {},
): WorkspaceWidgetKindCatalogEntry[] {
  return [
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
      ...overrides.terminal,
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
      ...overrides.commander,
    },
  ]
}

describe('seedDockviewWorkspaceBootstrap', () => {
  it('keeps the legacy seed layout when no catalog was supplied by the app shell', () => {
    const { api, addedPanels } = createDockviewApiMock()

    seedDockviewWorkspaceBootstrap(api as never)

    expect(addedPanels).toEqual([
      expect.objectContaining({ id: 'terminal-header', tabComponent: 'terminal-tab' }),
      expect.objectContaining({ id: 'terminal', tabComponent: 'terminal-tab' }),
      expect.objectContaining({ id: 'tool', tabComponent: 'commander-tab' }),
    ])
  })

  it('seeds terminal panels plus the explicit frontend-local commander when catalog truth allows them', () => {
    const { api, addedPanels } = createDockviewApiMock()

    seedDockviewWorkspaceBootstrap(api as never, createCatalog())

    expect(addedPanels).toEqual([
      expect.objectContaining({ id: 'terminal-header', tabComponent: 'terminal-tab' }),
      expect.objectContaining({ id: 'terminal', tabComponent: 'terminal-tab' }),
      expect.objectContaining({ id: 'tool', tabComponent: 'commander-tab' }),
    ])
  })

  it('does not seed unavailable or planned widget kinds from an explicit catalog', () => {
    const { api, addedPanels } = createDockviewApiMock()

    seedDockviewWorkspaceBootstrap(
      api as never,
      createCatalog({
        commander: {
          status: 'planned',
        },
        terminal: {
          can_create: false,
        },
      }),
    )

    expect(addedPanels).toEqual([])
  })
})
