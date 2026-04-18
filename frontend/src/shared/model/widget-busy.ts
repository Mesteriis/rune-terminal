import { createEvent, createStore } from 'effector'

export const toggleWidgetBusy = createEvent<string>()
export const clearWidgetBusy = createEvent<string>()
export const clearAllWidgetBusy = createEvent()

export const $busyWidgetHostIds = createStore<string[]>([])
  .on(toggleWidgetBusy, (hostIds, hostId) =>
    hostIds.includes(hostId)
      ? hostIds.filter((currentHostId) => currentHostId !== hostId)
      : [...hostIds, hostId],
  )
  .on(clearWidgetBusy, (hostIds, hostId) =>
    hostIds.filter((currentHostId) => currentHostId !== hostId),
  )
  .reset(clearAllWidgetBusy)
