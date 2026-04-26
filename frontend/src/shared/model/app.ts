import { createEvent, createStore } from 'effector'

export const openAiSidebar = createEvent()
export const closeAiSidebar = createEvent()
export const toggleAiSidebar = createEvent()

export const $isAiSidebarOpen = createStore(false)
  .on(openAiSidebar, () => true)
  .on(closeAiSidebar, () => false)
  .on(toggleAiSidebar, (isAiSidebarOpen) => !isAiSidebarOpen)
