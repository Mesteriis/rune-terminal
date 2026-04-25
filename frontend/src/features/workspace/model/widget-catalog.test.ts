import { describe, expect, it } from 'vitest'

import { type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'
import {
  getWorkspaceWidgetKindEntry,
  isWorkspaceWidgetKindCreatable,
  isWorkspaceWidgetKindFrontendLocal,
} from './widget-catalog'

const catalog: WorkspaceWidgetKindCatalogEntry[] = [
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
]

describe('workspace widget catalog helpers', () => {
  it('resolves backend-creatable kinds only from available runtime-owned entries', () => {
    expect(isWorkspaceWidgetKindCreatable(catalog, 'terminal')).toBe(true)
    expect(isWorkspaceWidgetKindCreatable(catalog, 'commander')).toBe(false)
    expect(isWorkspaceWidgetKindCreatable(catalog, 'preview')).toBe(false)
    expect(isWorkspaceWidgetKindCreatable(catalog, 'missing')).toBe(false)
  })

  it('distinguishes frontend-local kinds from planned or backend-owned kinds', () => {
    expect(isWorkspaceWidgetKindFrontendLocal(catalog, 'commander')).toBe(true)
    expect(isWorkspaceWidgetKindFrontendLocal(catalog, 'terminal')).toBe(false)
    expect(isWorkspaceWidgetKindFrontendLocal(catalog, 'preview')).toBe(false)
  })

  it('returns undefined for unknown catalog kinds', () => {
    expect(getWorkspaceWidgetKindEntry(catalog, 'missing')).toBeUndefined()
  })
})
