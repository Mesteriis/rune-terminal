import { describe, expect, it, vi } from 'vitest'

import {
  addDockviewWorkspace,
  deleteDockviewWorkspace,
  renameDockviewWorkspace,
  selectDockviewWorkspace,
} from './dockview-workspace.actions'
import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

function createWorkspaceTabs(): WorkspaceLayoutTab[] {
  return [
    { id: 1, title: 'Workspace-1', snapshot: null },
    { id: 2, title: 'Workspace-2', snapshot: null },
  ]
}

describe('dockview workspace actions', () => {
  it('does nothing when selecting the active workspace again', () => {
    const persistCurrentWorkspaceSnapshot = vi.fn()
    const restoreWorkspaceSnapshot = vi.fn()
    const setActiveWorkspaceId = vi.fn()

    expect(
      selectDockviewWorkspace({
        currentActiveWorkspaceId: 2,
        nextWorkspaceId: 2,
        persistCurrentWorkspaceSnapshot,
        restoreWorkspaceSnapshot,
        setActiveWorkspaceId,
      }),
    ).toBe(false)

    expect(persistCurrentWorkspaceSnapshot).not.toHaveBeenCalled()
    expect(setActiveWorkspaceId).not.toHaveBeenCalled()
    expect(restoreWorkspaceSnapshot).not.toHaveBeenCalled()
  })

  it('persists, activates, and restores when switching workspaces', () => {
    const calls: string[] = []

    expect(
      selectDockviewWorkspace({
        currentActiveWorkspaceId: 1,
        nextWorkspaceId: 2,
        persistCurrentWorkspaceSnapshot: () => {
          calls.push('persist')
        },
        setActiveWorkspaceId: (workspaceId) => {
          calls.push(`activate:${workspaceId}`)
        },
        restoreWorkspaceSnapshot: (workspaceId) => {
          calls.push(`restore:${workspaceId}`)
        },
      }),
    ).toBe(true)

    expect(calls).toEqual(['persist', 'activate:2', 'restore:2'])
  })

  it('appends, activates, and restores the next workspace tab', () => {
    const calls: string[] = []
    let nextTabs = createWorkspaceTabs()

    const nextWorkspace = addDockviewWorkspace({
      persistCurrentWorkspaceSnapshot: () => {
        calls.push('persist')
      },
      restoreWorkspaceSnapshot: (workspaceId) => {
        calls.push(`restore:${workspaceId}`)
      },
      setActiveWorkspaceId: (workspaceId) => {
        calls.push(`activate:${workspaceId}`)
      },
      updateWorkspaceTabs: (updater) => {
        nextTabs = updater(nextTabs)
        calls.push(`append:${nextTabs.length}`)
      },
      workspaceTabs: nextTabs,
    })

    expect(nextWorkspace).toEqual({
      id: 3,
      title: 'Workspace-3',
      snapshot: null,
    })
    expect(nextTabs).toEqual([
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 2, title: 'Workspace-2', snapshot: null },
      { id: 3, title: 'Workspace-3', snapshot: null },
    ])
    expect(calls).toEqual(['persist', 'append:3', 'activate:3', 'restore:3'])
  })

  it('renames a workspace tab with a trimmed title', () => {
    let nextTabs = createWorkspaceTabs()

    expect(
      renameDockviewWorkspace({
        nextTitle: '  Ops workspace  ',
        updateWorkspaceTabs: (updater) => {
          nextTabs = updater(nextTabs)
        },
        workspaceId: 2,
      }),
    ).toBe(true)

    expect(nextTabs).toEqual([
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 2, title: 'Ops workspace', snapshot: null },
    ])
  })

  it('keeps the current title when a workspace rename is empty', () => {
    let nextTabs = createWorkspaceTabs()

    expect(
      renameDockviewWorkspace({
        nextTitle: '   ',
        updateWorkspaceTabs: (updater) => {
          nextTabs = updater(nextTabs)
        },
        workspaceId: 2,
      }),
    ).toBe(false)

    expect(nextTabs).toEqual(createWorkspaceTabs())
  })

  it('deletes an inactive workspace without changing the active workspace', () => {
    const calls: string[] = []
    let nextTabs: WorkspaceLayoutTab[] = [
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 2, title: 'Workspace-2', snapshot: null },
      { id: 3, title: 'Workspace-3', snapshot: null },
    ]

    expect(
      deleteDockviewWorkspace({
        activeWorkspaceId: 2,
        persistCurrentWorkspaceSnapshot: () => {
          calls.push('persist')
        },
        restoreWorkspaceSnapshot: (workspaceId) => {
          calls.push(`restore:${workspaceId}`)
        },
        setActiveWorkspaceId: (workspaceId) => {
          calls.push(`activate:${workspaceId}`)
        },
        updateWorkspaceTabs: (updater) => {
          nextTabs = updater(nextTabs)
          calls.push(`delete:${nextTabs.length}`)
        },
        workspaceId: 1,
        workspaceTabs: nextTabs,
      }),
    ).toBe(true)

    expect(nextTabs).toEqual([
      { id: 2, title: 'Workspace-2', snapshot: null },
      { id: 3, title: 'Workspace-3', snapshot: null },
    ])
    expect(calls).toEqual(['persist', 'delete:2'])
  })

  it('deletes the active workspace and activates the nearest remaining tab', () => {
    const calls: string[] = []
    let nextTabs: WorkspaceLayoutTab[] = [
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 2, title: 'Workspace-2', snapshot: null },
      { id: 3, title: 'Workspace-3', snapshot: null },
    ]

    expect(
      deleteDockviewWorkspace({
        activeWorkspaceId: 2,
        persistCurrentWorkspaceSnapshot: () => {
          calls.push('persist')
        },
        restoreWorkspaceSnapshot: (workspaceId) => {
          calls.push(`restore:${workspaceId}`)
        },
        setActiveWorkspaceId: (workspaceId) => {
          calls.push(`activate:${workspaceId}`)
        },
        updateWorkspaceTabs: (updater) => {
          nextTabs = updater(nextTabs)
          calls.push(`delete:${nextTabs.length}`)
        },
        workspaceId: 2,
        workspaceTabs: nextTabs,
      }),
    ).toBe(true)

    expect(nextTabs).toEqual([
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 3, title: 'Workspace-3', snapshot: null },
    ])
    expect(calls).toEqual(['persist', 'delete:2', 'activate:1', 'restore:1'])
  })

  it('keeps the final workspace tab instead of deleting it', () => {
    const persistCurrentWorkspaceSnapshot = vi.fn()
    let nextTabs: WorkspaceLayoutTab[] = [{ id: 1, title: 'Workspace-1', snapshot: null }]

    expect(
      deleteDockviewWorkspace({
        activeWorkspaceId: 1,
        persistCurrentWorkspaceSnapshot,
        restoreWorkspaceSnapshot: vi.fn(),
        setActiveWorkspaceId: vi.fn(),
        updateWorkspaceTabs: (updater) => {
          nextTabs = updater(nextTabs)
        },
        workspaceId: 1,
        workspaceTabs: nextTabs,
      }),
    ).toBe(false)

    expect(persistCurrentWorkspaceSnapshot).not.toHaveBeenCalled()
    expect(nextTabs).toEqual([{ id: 1, title: 'Workspace-1', snapshot: null }])
  })
})
