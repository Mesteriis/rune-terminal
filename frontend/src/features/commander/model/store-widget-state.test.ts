import { describe, expect, it } from 'vitest'

import { withCommanderWidgetState } from '@/features/commander/model/store-widget-state'
import type { CommanderWidgetRuntimeState } from '@/features/commander/model/types'

describe('withCommanderWidgetState', () => {
  it('returns the original widgets map when the widget is missing', () => {
    const widgets = {} satisfies Record<string, CommanderWidgetRuntimeState>

    const nextWidgets = withCommanderWidgetState(
      widgets,
      { widgetId: 'missing-widget' },
      (widgetState) => widgetState,
    )

    expect(nextWidgets).toBe(widgets)
  })

  it('returns the original widgets map when the updater no-ops', () => {
    const widgetState = { activePane: 'left' } as CommanderWidgetRuntimeState
    const widgets = { 'widget-1': widgetState }

    const nextWidgets = withCommanderWidgetState(widgets, { widgetId: 'widget-1' }, () => null)

    expect(nextWidgets).toBe(widgets)
  })

  it('replaces only the targeted widget entry when the updater returns a new state', () => {
    const originalWidgetState = { activePane: 'left' } as CommanderWidgetRuntimeState
    const untouchedWidgetState = { activePane: 'right' } as CommanderWidgetRuntimeState
    const widgets = {
      'widget-1': originalWidgetState,
      'widget-2': untouchedWidgetState,
    }

    const nextWidgets = withCommanderWidgetState(widgets, { widgetId: 'widget-1' }, (widgetState) => ({
      ...widgetState,
      activePane: 'right',
    }))

    expect(nextWidgets).not.toBe(widgets)
    expect(nextWidgets['widget-1']).toEqual({
      ...originalWidgetState,
      activePane: 'right',
    })
    expect(nextWidgets['widget-2']).toBe(untouchedWidgetState)
  })
})
