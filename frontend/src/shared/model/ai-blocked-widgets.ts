import { createEvent, createStore } from 'effector'

export const toggleAiBlockedWidget = createEvent<string>()
export const unblockAiWidget = createEvent<string>()
export const clearAllAiBlockedWidgets = createEvent()

export const $aiBlockedWidgetHostIds = createStore<string[]>([])
  .on(toggleAiBlockedWidget, (hostIds, hostId) =>
    hostIds.includes(hostId)
      ? hostIds.filter((currentHostId) => currentHostId !== hostId)
      : [...hostIds, hostId],
  )
  .on(unblockAiWidget, (hostIds, hostId) =>
    hostIds.filter((currentHostId) => currentHostId !== hostId),
  )
  .reset(clearAllAiBlockedWidgets)
