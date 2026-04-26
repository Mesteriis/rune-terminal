import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type PluginInstallSourceKind = 'git' | 'zip'
export type PluginRuntimeStatus = 'disabled' | 'ready' | 'validation_error'

export type PluginActor = {
  home_dir?: string
  username: string
}

export type PluginAccessPolicy = {
  allowed_users?: string[]
  owner_username: string
  visibility?: string
}

export type InstalledPluginToolView = {
  approval_tier: string
  capabilities?: string[]
  description?: string
  input_schema?: unknown
  mutating?: boolean
  name: string
  output_schema?: unknown
  target_kind: string
}

export type InstalledPluginView = {
  access: PluginAccessPolicy
  capabilities?: string[]
  created_at?: string
  description?: string
  display_name: string
  enabled: boolean
  id: string
  installed_by: PluginActor
  metadata?: Record<string, string>
  plugin_version: string
  protocol_version: string
  runtime_error?: string
  runtime_status: PluginRuntimeStatus
  source: {
    kind: PluginInstallSourceKind
    ref?: string
    url: string
  }
  tools: InstalledPluginToolView[]
  updated_at?: string
  updated_by: PluginActor
}

export type PluginCatalogView = {
  current_actor: PluginActor
  plugins: InstalledPluginView[]
}

export type InstallPluginPayload = {
  access?: {
    allowed_users?: string[]
    visibility?: string
  }
  metadata?: Record<string, string>
  source: {
    kind: PluginInstallSourceKind
    ref?: string
    url: string
  }
}

type PluginCatalogMutationResponse = {
  plugin: InstalledPluginView
  plugins: PluginCatalogView
}

type PluginCatalogResponse = PluginCatalogView

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class PluginAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'PluginAPIError'
    this.status = status
    this.code = code
  }
}

async function requestPluginJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
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

    throw new PluginAPIError(
      response.status,
      errorPayload?.error?.code ?? 'plugin_request_failed',
      errorPayload?.error?.message ?? `Plugin request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

function normalizeActor(actor: PluginActor | undefined): PluginActor {
  return {
    home_dir: actor?.home_dir?.trim() || undefined,
    username: actor?.username?.trim() || 'unknown',
  }
}

function normalizeAccess(
  access: PluginAccessPolicy | undefined,
  installedBy: PluginActor,
): PluginAccessPolicy {
  return {
    allowed_users: Array.isArray(access?.allowed_users)
      ? access.allowed_users.map((entry) => entry.trim()).filter(Boolean)
      : undefined,
    owner_username: access?.owner_username?.trim() || installedBy.username,
    visibility: access?.visibility?.trim() || undefined,
  }
}

function normalizeTools(tools: InstalledPluginToolView[] | undefined) {
  if (!Array.isArray(tools)) {
    return []
  }
  return tools.map((tool) => ({
    ...tool,
    capabilities: Array.isArray(tool.capabilities)
      ? tool.capabilities.map((entry) => entry.trim()).filter(Boolean)
      : [],
    description: tool.description?.trim() || undefined,
    name: tool.name.trim(),
    target_kind: tool.target_kind.trim(),
  }))
}

function normalizeInstalledPlugin(plugin: InstalledPluginView): InstalledPluginView {
  const installedBy = normalizeActor(plugin.installed_by)
  const updatedBy = normalizeActor(plugin.updated_by)

  return {
    ...plugin,
    access: normalizeAccess(plugin.access, installedBy),
    capabilities: Array.isArray(plugin.capabilities)
      ? plugin.capabilities.map((entry) => entry.trim()).filter(Boolean)
      : [],
    created_at: plugin.created_at?.trim() || undefined,
    description: plugin.description?.trim() || undefined,
    display_name: plugin.display_name.trim(),
    enabled: plugin.enabled !== false,
    id: plugin.id.trim(),
    installed_by: installedBy,
    metadata: plugin.metadata ?? {},
    plugin_version: plugin.plugin_version.trim(),
    protocol_version: plugin.protocol_version.trim(),
    runtime_error: plugin.runtime_error?.trim() || undefined,
    runtime_status:
      plugin.runtime_status === 'disabled' || plugin.runtime_status === 'validation_error'
        ? plugin.runtime_status
        : 'ready',
    source: {
      kind: plugin.source?.kind === 'zip' ? 'zip' : 'git',
      ref: plugin.source?.ref?.trim() || undefined,
      url: plugin.source?.url?.trim() || '',
    },
    tools: normalizeTools(plugin.tools),
    updated_at: plugin.updated_at?.trim() || undefined,
    updated_by: updatedBy,
  }
}

function normalizeCatalog(catalog: PluginCatalogView): PluginCatalogView {
  return {
    current_actor: normalizeActor(catalog.current_actor),
    plugins: Array.isArray(catalog.plugins) ? catalog.plugins.map(normalizeInstalledPlugin) : [],
  }
}

export async function fetchInstalledPlugins() {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestPluginJSON<PluginCatalogResponse>(runtimeContext, '/api/v1/plugins')
  return normalizeCatalog(payload)
}

export async function installPlugin(payload: InstallPluginPayload) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestPluginJSON<PluginCatalogMutationResponse>(
    runtimeContext,
    '/api/v1/plugins/install',
    {
      body: JSON.stringify({
        access: {
          allowed_users: payload.access?.allowed_users ?? [],
          owner_username: '',
          visibility: payload.access?.visibility?.trim() || undefined,
        },
        metadata: payload.metadata ?? {},
        source: {
          kind: payload.source.kind,
          ref: payload.source.ref?.trim() || undefined,
          url: payload.source.url.trim(),
        },
      }),
      method: 'POST',
    },
  )

  return {
    plugin: normalizeInstalledPlugin(response.plugin),
    plugins: normalizeCatalog(response.plugins),
  }
}

async function mutatePlugin(pluginID: string, method: 'POST' | 'DELETE', path: string) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestPluginJSON<PluginCatalogMutationResponse>(
    runtimeContext,
    `/api/v1/plugins/${encodeURIComponent(pluginID)}${path}`,
    { method },
  )
  return {
    plugin: normalizeInstalledPlugin(response.plugin),
    plugins: normalizeCatalog(response.plugins),
  }
}

export async function enablePlugin(pluginID: string) {
  return mutatePlugin(pluginID, 'POST', '/enable')
}

export async function disablePlugin(pluginID: string) {
  return mutatePlugin(pluginID, 'POST', '/disable')
}

export async function updateInstalledPlugin(pluginID: string) {
  return mutatePlugin(pluginID, 'POST', '/update')
}

export async function deleteInstalledPlugin(pluginID: string) {
  return mutatePlugin(pluginID, 'DELETE', '')
}
