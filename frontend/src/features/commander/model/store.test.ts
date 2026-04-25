import { allSettled, fork } from 'effector'
import { describe, expect, it } from 'vitest'

import {
  $commanderWidgets,
  goCommanderActivePaneHistoryBack,
  mountCommanderWidget,
  openCommanderActivePaneEntry,
  requestCommanderActivePaneEdit,
  requestCommanderActivePaneView,
  saveCommanderFileDialog,
  setCommanderPanePath,
} from '@/features/commander/model/store'

describe('$commanderWidgets backend-owned async action boundaries', () => {
  it('keeps backend-owned async events out of the synchronous reducer path', async () => {
    const scope = fork()

    await allSettled(mountCommanderWidget, {
      scope,
      params: {
        widgetId: 'widget-1',
      },
    })

    const initialState = scope.getState($commanderWidgets)

    await allSettled(requestCommanderActivePaneView, {
      scope,
      params: { widgetId: 'widget-1' },
    })
    await allSettled(requestCommanderActivePaneEdit, {
      scope,
      params: { widgetId: 'widget-1' },
    })
    await allSettled(saveCommanderFileDialog, {
      scope,
      params: { widgetId: 'widget-1' },
    })
    await allSettled(openCommanderActivePaneEntry, {
      scope,
      params: { widgetId: 'widget-1' },
    })
    await allSettled(goCommanderActivePaneHistoryBack, {
      scope,
      params: { widgetId: 'widget-1' },
    })
    await allSettled(setCommanderPanePath, {
      scope,
      params: {
        widgetId: 'widget-1',
        paneId: 'left',
        path: '/tmp',
      },
    })

    expect(scope.getState($commanderWidgets)).toEqual(initialState)
  })
})
