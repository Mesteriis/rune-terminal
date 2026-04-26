import type { DockviewApi } from 'dockview-react'

let activeDockviewApi: DockviewApi | null = null

export function setActiveDockviewApi(api: DockviewApi | null) {
  activeDockviewApi = api
}

export function getActiveDockviewApi() {
  return activeDockviewApi
}
