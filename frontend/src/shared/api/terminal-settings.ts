import { resolveRuntimeContext } from '@/shared/api/runtime'

export type TerminalSettings = {
  font_size: number
  line_height: number
  theme_mode: TerminalThemeMode
  scrollback: number
  cursor_style: TerminalCursorStyle
  cursor_blink: boolean
}

export type TerminalThemeMode = 'adaptive' | 'contrast'
export type TerminalCursorStyle = 'block' | 'bar' | 'underline'

type TerminalSettingsPayload = {
  settings?: {
    font_size?: number | null
    line_height?: number | null
    theme_mode?: string | null
    scrollback?: number | null
    cursor_style?: string | null
    cursor_blink?: boolean | null
  } | null
}

export const DEFAULT_TERMINAL_FONT_SIZE = 13
export const MIN_TERMINAL_FONT_SIZE = 11
export const MAX_TERMINAL_FONT_SIZE = 16
export const DEFAULT_TERMINAL_LINE_HEIGHT = 1.25
export const MIN_TERMINAL_LINE_HEIGHT = 1.05
export const MAX_TERMINAL_LINE_HEIGHT = 1.6
export const DEFAULT_TERMINAL_THEME_MODE: TerminalThemeMode = 'adaptive'
export const DEFAULT_TERMINAL_SCROLLBACK = 5000
export const MIN_TERMINAL_SCROLLBACK = 1000
export const MAX_TERMINAL_SCROLLBACK = 20000
export const DEFAULT_TERMINAL_CURSOR_STYLE: TerminalCursorStyle = 'block'
export const DEFAULT_TERMINAL_CURSOR_BLINK = true

export function clampTerminalFontSize(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TERMINAL_FONT_SIZE
  }

  return Math.min(MAX_TERMINAL_FONT_SIZE, Math.max(MIN_TERMINAL_FONT_SIZE, Math.round(value)))
}

export function clampTerminalLineHeight(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TERMINAL_LINE_HEIGHT
  }

  const clamped = Math.min(MAX_TERMINAL_LINE_HEIGHT, Math.max(MIN_TERMINAL_LINE_HEIGHT, value))
  return Math.round(clamped * 100) / 100
}

export function clampTerminalThemeMode(value: string | null | undefined): TerminalThemeMode {
  switch (
    String(value ?? '')
      .trim()
      .toLowerCase()
  ) {
    case 'contrast':
      return 'contrast'
    case 'adaptive':
    default:
      return DEFAULT_TERMINAL_THEME_MODE
  }
}

export function clampTerminalCursorStyle(value: string | null | undefined): TerminalCursorStyle {
  switch (
    String(value ?? '')
      .trim()
      .toLowerCase()
  ) {
    case 'bar':
      return 'bar'
    case 'underline':
      return 'underline'
    case 'block':
    default:
      return DEFAULT_TERMINAL_CURSOR_STYLE
  }
}

export function clampTerminalScrollback(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TERMINAL_SCROLLBACK
  }

  return Math.min(MAX_TERMINAL_SCROLLBACK, Math.max(MIN_TERMINAL_SCROLLBACK, Math.round(value)))
}

function normalizeTerminalSettings(payload: TerminalSettingsPayload) {
  return {
    font_size: clampTerminalFontSize(payload.settings?.font_size ?? DEFAULT_TERMINAL_FONT_SIZE),
    line_height: clampTerminalLineHeight(payload.settings?.line_height ?? DEFAULT_TERMINAL_LINE_HEIGHT),
    theme_mode: clampTerminalThemeMode(payload.settings?.theme_mode),
    scrollback: clampTerminalScrollback(payload.settings?.scrollback ?? DEFAULT_TERMINAL_SCROLLBACK),
    cursor_style: clampTerminalCursorStyle(payload.settings?.cursor_style),
    cursor_blink: payload.settings?.cursor_blink ?? DEFAULT_TERMINAL_CURSOR_BLINK,
  } satisfies TerminalSettings
}

export async function requestTerminalSettings() {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/settings/terminal`, {
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to load terminal settings (${response.status})`)
  }

  const payload = (await response.json()) as TerminalSettingsPayload
  return normalizeTerminalSettings(payload)
}

export async function updateTerminalSettings(settings: TerminalSettings) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/settings/terminal`, {
    body: JSON.stringify({
      font_size: clampTerminalFontSize(settings.font_size),
      line_height: clampTerminalLineHeight(settings.line_height),
      theme_mode: clampTerminalThemeMode(settings.theme_mode),
      scrollback: clampTerminalScrollback(settings.scrollback),
      cursor_style: clampTerminalCursorStyle(settings.cursor_style),
      cursor_blink: settings.cursor_blink,
    }),
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  })

  if (!response.ok) {
    throw new Error(`Unable to update terminal settings (${response.status})`)
  }

  const payload = (await response.json()) as TerminalSettingsPayload
  return normalizeTerminalSettings(payload)
}
