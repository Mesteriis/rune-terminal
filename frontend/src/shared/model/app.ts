import { createEvent, createStore } from 'effector'

export const toggleAiSidebar = createEvent()

export const $isAiSidebarOpen = createStore(false).on(
  toggleAiSidebar,
  (isAiSidebarOpen) => !isAiSidebarOpen,
)
