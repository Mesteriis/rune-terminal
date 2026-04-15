import { invoke } from '@tauri-apps/api/core'

export type RuntimeInfo = {
  base_url: string
  auth_token: string
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

export async function resolveRuntimeInfo(): Promise<RuntimeInfo> {
  const baseUrl = import.meta.env.VITE_RTERM_API_BASE
  const authToken = import.meta.env.VITE_RTERM_AUTH_TOKEN
  if (baseUrl && authToken) {
    return { base_url: baseUrl, auth_token: authToken }
  }
  if (window.__TAURI_INTERNALS__) {
    return invoke<RuntimeInfo>('runtime_info')
  }
  throw new Error(
    'Runtime discovery failed. Start the app through Tauri or set VITE_RTERM_API_BASE and VITE_RTERM_AUTH_TOKEN.',
  )
}

