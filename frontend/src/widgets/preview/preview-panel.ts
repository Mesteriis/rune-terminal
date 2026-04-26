export type PreviewPanelParams = {
  component: 'preview'
  connectionId?: string
  path: string
  title: string
  widgetId: string
}

type CreatePreviewPanelParamsInput = {
  connectionId?: string
  path: string
  title?: string
  widgetId: string
}

function getPathTitle(path: string) {
  const trimmedPath = path.replace(/\/+$/g, '')
  const lastSegment = trimmedPath.split('/').filter(Boolean).pop()

  return lastSegment || trimmedPath || 'Preview'
}

export function createPreviewPanelParams({
  connectionId,
  path,
  title = getPathTitle(path),
  widgetId,
}: CreatePreviewPanelParamsInput): PreviewPanelParams {
  return {
    component: 'preview',
    connectionId,
    path,
    title,
    widgetId,
  }
}

export function isPreviewPanelParams(value: unknown): value is PreviewPanelParams {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PreviewPanelParams>

  return (
    candidate.component === 'preview' &&
    typeof candidate.path === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.widgetId === 'string' &&
    (candidate.connectionId === undefined || typeof candidate.connectionId === 'string')
  )
}

export function resolvePreviewPanelParams(params: unknown) {
  return isPreviewPanelParams(params) ? params : null
}
