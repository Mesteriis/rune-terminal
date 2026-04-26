export type RuntimeContext = {
  authToken: string
  baseUrl: string
  colorTerm: string
  defaultShell: string
  homeDir: string
  repoRoot: string
  term: string
}

export type RuntimeWatcherMode = 'ephemeral' | 'persistent'
export type WindowTitleMode = 'auto' | 'custom'
export type WindowTitleSettings = {
  auto_title: string
  settings: {
    custom_title: string
    mode: WindowTitleMode
  }
}

type RuntimeInfoPayload = {
  auth_token?: string
  base_url?: string
}

type RuntimeSettingsPayload = {
  watcher_mode: RuntimeWatcherMode | string
}

type RuntimeShutdownPayload = {
  can_close: boolean
  active_tasks: number
  watcher_mode: string
}

type WindowTitleSettingsPayload = {
  auto_title?: string
  settings?: {
    custom_title?: string
    mode?: string
  }
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

type BootstrapPayload = {
  color_term?: string
  default_shell?: string
  home_dir?: string
  repo_root?: string
  term?: string
}

type TauriInternals = {
  invoke?: <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals
  }
}

let runtimeContextPromise: Promise<RuntimeContext> | null = null

function normalizePathSeparators(path: string) {
  return path.replace(/\\/g, '/')
}

function trimTrailingSeparators(path: string) {
  const normalizedPath = normalizePathSeparators(path)

  if (/^[A-Za-z]:\/$/.test(normalizedPath) || normalizedPath === '/') {
    return normalizedPath
  }

  return normalizedPath.replace(/\/+$/g, '')
}

function isAbsolutePath(path: string) {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\')
}

function normalizeJoinedPath(basePath: string, nextPath: string) {
  const normalizedBasePath = trimTrailingSeparators(basePath)
  const normalizedNextPath = normalizePathSeparators(nextPath)
  const drivePrefixMatch = normalizedBasePath.match(/^[A-Za-z]:/)
  const hasLeadingSlash = normalizedBasePath.startsWith('/')
  const pathSegments = `${normalizedBasePath}/${normalizedNextPath}`
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .reduce<string[]>((segments, segment) => {
      if (segment === '..') {
        if (segments.length > 0 && segments[segments.length - 1] !== '..') {
          segments.pop()
        }
        return segments
      }

      segments.push(segment)
      return segments
    }, [])

  const joinedPath = pathSegments.join('/')

  if (drivePrefixMatch) {
    const drivePrefix = drivePrefixMatch[0]
    const withoutDrivePrefix = joinedPath.replace(new RegExp(`^${drivePrefix}/?`), '')
    return withoutDrivePrefix ? `${drivePrefix}/${withoutDrivePrefix}` : `${drivePrefix}/`
  }

  if (hasLeadingSlash) {
    return joinedPath ? `/${joinedPath}` : '/'
  }

  return joinedPath
}

function readRuntimeTransportFromEnv() {
  const baseUrl = import.meta.env.VITE_RTERM_API_BASE?.trim()
  const authToken = import.meta.env.VITE_RTERM_AUTH_TOKEN?.trim()

  if (!baseUrl || !authToken) {
    return null
  }

  return {
    authToken,
    baseUrl,
  }
}

async function readRuntimeTransportFromTauri() {
  if (typeof window === 'undefined') {
    return null
  }

  const invoke = window.__TAURI_INTERNALS__?.invoke

  if (typeof invoke !== 'function') {
    return null
  }

  const payload = await invoke<RuntimeInfoPayload>('runtime_info')
  const baseUrl = payload.base_url?.trim()
  const authToken = payload.auth_token?.trim()

  if (!baseUrl || !authToken) {
    throw new Error('Tauri runtime_info did not provide base_url/auth_token')
  }

  return {
    authToken,
    baseUrl,
  }
}

function getTauriInvoker() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.__TAURI_INTERNALS__?.invoke
}

export function canUpdateRuntimeSettings() {
  return typeof getTauriInvoker() === 'function'
}

async function resolveRuntimeTransport() {
  const envTransport = readRuntimeTransportFromEnv()

  if (envTransport) {
    return envTransport
  }

  const tauriTransport = await readRuntimeTransportFromTauri()

  if (tauriTransport) {
    return tauriTransport
  }

  throw new Error('Unable to resolve runtime transport')
}

async function requestRuntimeJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
  const response = await fetch(`${runtimeContext.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : null),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let errorPayload: APIErrorEnvelope | null = null

    try {
      errorPayload = (await response.json()) as APIErrorEnvelope
    } catch {
      errorPayload = null
    }

    throw new Error(errorPayload?.error?.message ?? `Runtime request failed (${response.status})`)
  }

  return (await response.json()) as T
}

async function loadRuntimeContext(): Promise<RuntimeContext> {
  const transport = await resolveRuntimeTransport()
  const response = await fetch(`${transport.baseUrl}/api/v1/bootstrap`, {
    headers: {
      Authorization: `Bearer ${transport.authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to load runtime bootstrap (${response.status})`)
  }

  const payload = (await response.json()) as BootstrapPayload
  const repoRoot = payload.repo_root?.trim()

  if (!repoRoot) {
    throw new Error('Runtime bootstrap did not provide repo_root')
  }

  return {
    authToken: transport.authToken,
    baseUrl: transport.baseUrl,
    colorTerm: payload.color_term?.trim() ?? '',
    defaultShell: payload.default_shell?.trim() ?? '',
    homeDir: trimTrailingSeparators(payload.home_dir?.trim() ?? ''),
    repoRoot: trimTrailingSeparators(repoRoot),
    term: payload.term?.trim() ?? '',
  }
}

export async function requestRuntimeSettings() {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    return { watcher_mode: 'ephemeral' as const }
  }

  return invoke<RuntimeSettingsPayload>('runtime_settings')
}

function normalizeWindowTitleMode(mode: unknown): WindowTitleMode {
  return mode === 'custom' ? 'custom' : 'auto'
}

function normalizeWindowTitleSettings(payload: WindowTitleSettingsPayload): WindowTitleSettings {
  return {
    auto_title: payload.auto_title?.trim() || '',
    settings: {
      custom_title: payload.settings?.custom_title?.trim() || '',
      mode: normalizeWindowTitleMode(payload.settings?.mode),
    },
  }
}

export async function requestWindowTitleSettings() {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestRuntimeJSON<WindowTitleSettingsPayload>(
    runtimeContext,
    '/api/v1/settings/window-title',
  )
  return normalizeWindowTitleSettings(payload)
}

export async function updateWindowTitleSettings(input: { custom_title?: string; mode?: WindowTitleMode }) {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestRuntimeJSON<WindowTitleSettingsPayload>(
    runtimeContext,
    '/api/v1/settings/window-title',
    {
      body: JSON.stringify({
        custom_title: input.custom_title,
        mode: input.mode,
      }),
      method: 'PUT',
    },
  )
  return normalizeWindowTitleSettings(payload)
}

export async function setRuntimeWatcherMode(mode: RuntimeWatcherMode) {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    throw new Error('Runtime settings mutation is only available in the desktop app.')
  }

  return invoke<void>('set_watcher_mode', { mode })
}

export async function requestRuntimeShutdown({ force = false }: { force?: boolean } = {}) {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    return {
      can_close: true,
      active_tasks: 0,
      watcher_mode: 'ephemeral',
    } as RuntimeShutdownPayload
  }

  return invoke<RuntimeShutdownPayload>('request_shutdown', { force })
}

export async function closeRuntimeWindow() {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    return
  }

  return invoke<void>('close_window')
}

export async function minimizeRuntimeWindow() {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    return
  }

  return invoke<void>('minimize_window')
}

export async function toggleRuntimeFullscreen() {
  const invoke = getTauriInvoker()

  if (typeof invoke !== 'function') {
    return
  }

  return invoke<void>('toggle_fullscreen_window')
}

export function resetRuntimeContextCacheForTests() {
  runtimeContextPromise = null
}

export async function resolveRuntimeContext() {
  if (!runtimeContextPromise) {
    runtimeContextPromise = loadRuntimeContext()
  }

  return runtimeContextPromise
}

export function formatRuntimePathForDisplay(path: string, runtimeContext: Pick<RuntimeContext, 'homeDir'>) {
  const normalizedPath = trimTrailingSeparators(path)
  const normalizedHomeDir = trimTrailingSeparators(runtimeContext.homeDir)

  if (!normalizedPath || !normalizedHomeDir) {
    return normalizedPath
  }

  if (normalizedPath === normalizedHomeDir) {
    return '~'
  }

  if (normalizedPath.startsWith(`${normalizedHomeDir}/`)) {
    return `~${normalizedPath.slice(normalizedHomeDir.length)}`
  }

  return normalizedPath
}

export function joinRuntimePath(path: string, name: string) {
  return normalizeJoinedPath(path, name)
}

export function getRuntimePathParent(path: string) {
  const normalizedPath = trimTrailingSeparators(path)

  if (!normalizedPath || normalizedPath === '/' || /^[A-Za-z]:\/$/.test(normalizedPath)) {
    return null
  }

  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  if (lastSlashIndex === -1) {
    return null
  }

  if (lastSlashIndex === 0) {
    return '/'
  }

  return normalizedPath.slice(0, lastSlashIndex)
}

export function resolveRuntimePathInput(
  inputValue: string,
  runtimeContext: Pick<RuntimeContext, 'homeDir'>,
  currentPath: string,
) {
  const trimmedInputValue = inputValue.trim()

  if (!trimmedInputValue) {
    return currentPath
  }

  const normalizedInputValue = normalizePathSeparators(trimmedInputValue)

  if (normalizedInputValue === '~' && runtimeContext.homeDir) {
    return trimTrailingSeparators(runtimeContext.homeDir)
  }

  if (normalizedInputValue.startsWith('~/') && runtimeContext.homeDir) {
    return normalizeJoinedPath(runtimeContext.homeDir, normalizedInputValue.slice(2))
  }

  if (isAbsolutePath(normalizedInputValue)) {
    return trimTrailingSeparators(normalizedInputValue)
  }

  return normalizeJoinedPath(currentPath, normalizedInputValue)
}
