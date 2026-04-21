import { createEvent, createStore } from 'effector'

export const blockAiWidget = createEvent<string>()
export const toggleAiBlockedWidget = createEvent<string>()
export const unblockAiWidget = createEvent<string>()
export const clearAllAiBlockedWidgets = createEvent()

export const $aiBlockedWidgetHostIds = createStore<string[]>([])
  .on(blockAiWidget, (hostIds, hostId) => (hostIds.includes(hostId) ? hostIds : [...hostIds, hostId]))
  .on(toggleAiBlockedWidget, (hostIds, hostId) =>
    hostIds.includes(hostId)
      ? hostIds.filter((currentHostId) => currentHostId !== hostId)
      : [...hostIds, hostId],
  )
  .on(unblockAiWidget, (hostIds, hostId) => hostIds.filter((currentHostId) => currentHostId !== hostId))
  .reset(clearAllAiBlockedWidgets)
