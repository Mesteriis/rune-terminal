import { createEvent, createStore } from 'effector'

export const setActiveWidgetHostId = createEvent<string>()
export const clearActiveWidgetHostId = createEvent()

export const $activeWidgetHostId = createStore<string | null>(null)
  .on(setActiveWidgetHostId, (_currentHostId, hostId) => hostId)
  .reset(clearActiveWidgetHostId)
