export type FilesPanelParams = {
  component: 'files'
  connectionId?: string
  path: string
  title: string
  widgetId: string
}

type CreateFilesPanelParamsInput = {
  connectionId?: string
  path: string
  title?: string
  widgetId: string
}

function getPathTitle(path: string) {
  const trimmedPath = path.replace(/\/+$/g, '')
  const lastSegment = trimmedPath.split('/').filter(Boolean).pop()

  return lastSegment || trimmedPath || 'Files'
}

export function createFilesPanelParams({
  connectionId,
  path,
  title = getPathTitle(path),
  widgetId,
}: CreateFilesPanelParamsInput): FilesPanelParams {
  return {
    component: 'files',
    connectionId,
    path,
    title,
    widgetId,
  }
}

export function isFilesPanelParams(value: unknown): value is FilesPanelParams {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<FilesPanelParams>

  return (
    candidate.component === 'files' &&
    typeof candidate.path === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.widgetId === 'string' &&
    (candidate.connectionId === undefined || typeof candidate.connectionId === 'string')
  )
}

export function resolveFilesPanelParams(params: unknown) {
  return isFilesPanelParams(params) ? params : null
}
