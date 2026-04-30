import { resolveRuntimeContext } from '@/shared/api/runtime'

export type AgentSettings = {
  composer_submit_mode: AgentComposerSubmitMode
  debug_mode_enabled: boolean
}

export type AgentComposerSubmitMode = 'enter-sends' | 'mod-enter-sends'

type AgentSettingsPayload = {
  settings?: {
    composer_submit_mode?: string | null
    debug_mode_enabled?: boolean | null
  } | null
}

export const DEFAULT_AGENT_COMPOSER_SUBMIT_MODE: AgentComposerSubmitMode = 'enter-sends'

export function clampAgentComposerSubmitMode(value: string | null | undefined): AgentComposerSubmitMode {
  return value === 'mod-enter-sends' ? 'mod-enter-sends' : DEFAULT_AGENT_COMPOSER_SUBMIT_MODE
}

function normalizeAgentSettings(payload: AgentSettingsPayload) {
  return {
    composer_submit_mode: clampAgentComposerSubmitMode(payload.settings?.composer_submit_mode),
    debug_mode_enabled: payload.settings?.debug_mode_enabled === true,
  } satisfies AgentSettings
}

export async function requestAgentSettings() {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/settings/agent`, {
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to load agent settings (${response.status})`)
  }

  const payload = (await response.json()) as AgentSettingsPayload
  return normalizeAgentSettings(payload)
}

export async function updateAgentSettings(settings: AgentSettings) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/settings/agent`, {
    body: JSON.stringify({
      composer_submit_mode: clampAgentComposerSubmitMode(settings.composer_submit_mode),
      debug_mode_enabled: settings.debug_mode_enabled,
    }),
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  })

  if (!response.ok) {
    throw new Error(`Unable to update agent settings (${response.status})`)
  }

  const payload = (await response.json()) as AgentSettingsPayload
  return normalizeAgentSettings(payload)
}
