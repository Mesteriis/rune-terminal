import type {
  AgentProviderKind,
  AgentProviderView,
  AgentProxyAuthType,
  AgentProxyChannelStatus,
  AgentProxyServiceType,
  CreateAgentProviderPayload,
  UpdateAgentProviderPayload,
} from '@/features/agent/api/provider-client'

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1'
const DEFAULT_CODEX_MODEL = 'gpt-5-codex'
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini'
const DEFAULT_PROXY_MODEL = 'assistant-default'

let providerDraftSequence = 0

function nextDraftID(prefix: string) {
  providerDraftSequence += 1
  return `${prefix}-${providerDraftSequence}`
}

function normalizeText(value: string) {
  return value.trim()
}

function splitTextareaLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function formatModelMappingText(mapping?: Record<string, string>) {
  if (!mapping) {
    return ''
  }

  return Object.entries(mapping)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([source, target]) => `${source}=${target}`)
    .join('\n')
}

function parseModelMappingText(value: string) {
  const mapping: Record<string, string> = {}

  for (const line of splitTextareaLines(value)) {
    const separatorIndex = line.includes('=>') ? line.indexOf('=>') : line.indexOf('=')

    if (separatorIndex < 0) {
      throw new Error(`Model mapping line "${line}" must use "=" or "=>".`)
    }

    const source = line.slice(0, separatorIndex).trim()
    const target = line.slice(separatorIndex + (line.includes('=>') ? 2 : 1)).trim()

    if (!source || !target) {
      throw new Error(`Model mapping line "${line}" must include both source and target.`)
    }

    mapping[source] = target
  }

  return Object.keys(mapping).length > 0 ? mapping : undefined
}

function parseOptionalPriority(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return undefined
  }

  const parsed = Number.parseInt(normalized, 10)

  if (!Number.isFinite(parsed)) {
    throw new Error('Channel priority must be an integer.')
  }

  return parsed
}

function buildEnabledAPIKeys(value: string) {
  return splitTextareaLines(value).map((key) => ({
    key,
    enabled: true,
  }))
}

function requireText(value: string, label: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    throw new Error(`${label} is required.`)
  }

  return normalized
}

export type AgentProviderDraftMode = 'existing' | 'new'
export type AgentOpenAISecretMode = 'preserve' | 'replace'
export type AgentProxyChannelKeyMode = 'preserve' | 'replace'

export type AgentProxyChannelDraft = {
  uid: string
  id: string
  name: string
  serviceType: AgentProxyServiceType
  baseURL: string
  fallbackBaseURLsText: string
  authType: AgentProxyAuthType
  priority: string
  status: AgentProxyChannelStatus
  description: string
  insecureSkipVerify: boolean
  modelMappingText: string
  keyMode: AgentProxyChannelKeyMode
  apiKeysText: string
  keyCount: number
  enabledKeyCount: number
}

export type AgentProviderDraft = {
  mode: AgentProviderDraftMode
  id?: string
  kind: AgentProviderKind
  displayName: string
  enabled: boolean
  ollama: {
    baseURL: string
    model: string
  }
  codex: {
    model: string
    authFilePath: string
  }
  openai: {
    baseURL: string
    model: string
    apiKey: string
    hasStoredAPIKey: boolean
    secretMode: AgentOpenAISecretMode
  }
  proxy: {
    model: string
    channels: AgentProxyChannelDraft[]
  }
}

export function createEmptyProxyChannelDraft(
  overrides: Partial<AgentProxyChannelDraft> = {},
): AgentProxyChannelDraft {
  return {
    uid: overrides.uid ?? nextDraftID('proxy-channel'),
    id: overrides.id ?? '',
    name: overrides.name ?? 'Primary channel',
    serviceType: overrides.serviceType ?? 'openai',
    baseURL: overrides.baseURL ?? DEFAULT_OPENAI_BASE_URL,
    fallbackBaseURLsText: overrides.fallbackBaseURLsText ?? '',
    authType: overrides.authType ?? '',
    priority: overrides.priority ?? '',
    status: overrides.status ?? 'active',
    description: overrides.description ?? '',
    insecureSkipVerify: overrides.insecureSkipVerify ?? false,
    modelMappingText: overrides.modelMappingText ?? '',
    keyMode: overrides.keyMode ?? 'replace',
    apiKeysText: overrides.apiKeysText ?? '',
    keyCount: overrides.keyCount ?? 0,
    enabledKeyCount: overrides.enabledKeyCount ?? 0,
  }
}

export function createEmptyProviderDraft(kind: AgentProviderKind): AgentProviderDraft {
  const proxyChannel = createEmptyProxyChannelDraft()

  return {
    mode: 'new',
    kind,
    displayName: '',
    enabled: true,
    ollama: {
      baseURL: DEFAULT_OLLAMA_BASE_URL,
      model: '',
    },
    codex: {
      model: DEFAULT_CODEX_MODEL,
      authFilePath: '',
    },
    openai: {
      baseURL: DEFAULT_OPENAI_BASE_URL,
      model: DEFAULT_OPENAI_MODEL,
      apiKey: '',
      hasStoredAPIKey: false,
      secretMode: 'replace',
    },
    proxy: {
      model: DEFAULT_PROXY_MODEL,
      channels: [proxyChannel],
    },
  }
}

export function createProviderDraftFromView(provider: AgentProviderView): AgentProviderDraft {
  return {
    mode: 'existing',
    id: provider.id,
    kind: provider.kind,
    displayName: provider.display_name,
    enabled: provider.enabled,
    ollama: {
      baseURL: provider.ollama?.base_url ?? DEFAULT_OLLAMA_BASE_URL,
      model: provider.ollama?.model ?? '',
    },
    codex: {
      model: provider.codex?.model ?? DEFAULT_CODEX_MODEL,
      authFilePath: provider.codex?.auth_file_path ?? '',
    },
    openai: {
      baseURL: provider.openai?.base_url ?? DEFAULT_OPENAI_BASE_URL,
      model: provider.openai?.model ?? DEFAULT_OPENAI_MODEL,
      apiKey: '',
      hasStoredAPIKey: provider.openai?.has_api_key ?? false,
      secretMode: 'preserve',
    },
    proxy: {
      model: provider.proxy?.model ?? DEFAULT_PROXY_MODEL,
      channels:
        provider.proxy?.channels.map((channel) =>
          createEmptyProxyChannelDraft({
            id: channel.id,
            name: channel.name,
            serviceType: channel.service_type,
            baseURL: channel.base_url ?? '',
            fallbackBaseURLsText: (channel.base_urls ?? []).join('\n'),
            authType: channel.auth_type ?? '',
            priority: channel.priority == null ? '' : String(channel.priority),
            status: channel.status ?? 'active',
            description: channel.description ?? '',
            insecureSkipVerify: channel.insecure_skip_verify ?? false,
            modelMappingText: formatModelMappingText(channel.model_mapping),
            keyMode: 'preserve',
            apiKeysText: '',
            keyCount: channel.key_count,
            enabledKeyCount: channel.enabled_key_count,
          }),
        ) ?? [],
    },
  }
}

function buildProxyChannelPayload(draft: AgentProxyChannelDraft) {
  const baseURLs = splitTextareaLines(draft.fallbackBaseURLsText)
  const authType = draft.authType || undefined

  const payload = {
    id: normalizeText(draft.id) || undefined,
    name: requireText(draft.name, 'Channel name'),
    service_type: draft.serviceType,
    base_url: requireText(draft.baseURL, 'Channel base URL'),
    base_urls: baseURLs.length > 0 ? baseURLs : undefined,
    auth_type: authType,
    priority: parseOptionalPriority(draft.priority),
    status: draft.status,
    model_mapping: parseModelMappingText(draft.modelMappingText),
    description: normalizeText(draft.description) || undefined,
    insecure_skip_verify: draft.insecureSkipVerify || undefined,
  }

  return payload
}

export function buildCreateProviderPayload(draft: AgentProviderDraft): CreateAgentProviderPayload {
  const payload: CreateAgentProviderPayload = {
    kind: draft.kind,
    display_name: normalizeText(draft.displayName),
    enabled: draft.enabled,
  }

  switch (draft.kind) {
    case 'ollama':
      payload.ollama = {
        base_url: requireText(draft.ollama.baseURL, 'Ollama base URL'),
        model: normalizeText(draft.ollama.model) || undefined,
      }
      return payload
    case 'codex':
      payload.codex = {
        model: requireText(draft.codex.model, 'Codex model'),
        auth_file_path: normalizeText(draft.codex.authFilePath) || undefined,
      }
      return payload
    case 'openai':
      payload.openai = {
        base_url: requireText(draft.openai.baseURL, 'OpenAI base URL'),
        model: requireText(draft.openai.model, 'OpenAI model'),
        api_key: requireText(draft.openai.apiKey, 'OpenAI API key'),
      }
      return payload
    case 'proxy':
      payload.proxy = {
        model: requireText(draft.proxy.model, 'Proxy model'),
        channels: draft.proxy.channels.map((channelDraft) => ({
          ...buildProxyChannelPayload(channelDraft),
          api_keys: buildEnabledAPIKeys(channelDraft.apiKeysText),
        })),
      }
      return payload
    default:
      throw new Error(`Unsupported provider kind: ${draft.kind}`)
  }
}

export function buildUpdateProviderPayload(draft: AgentProviderDraft): UpdateAgentProviderPayload {
  if (!draft.id) {
    throw new Error('Existing provider id is required.')
  }

  const payload: UpdateAgentProviderPayload = {
    display_name: normalizeText(draft.displayName),
    enabled: draft.enabled,
  }

  switch (draft.kind) {
    case 'ollama':
      payload.ollama = {
        base_url: requireText(draft.ollama.baseURL, 'Ollama base URL'),
        model: normalizeText(draft.ollama.model) || undefined,
      }
      return payload
    case 'codex':
      payload.codex = {
        model: requireText(draft.codex.model, 'Codex model'),
        auth_file_path: normalizeText(draft.codex.authFilePath) || undefined,
      }
      return payload
    case 'openai':
      payload.openai = {
        base_url: requireText(draft.openai.baseURL, 'OpenAI base URL'),
        model: requireText(draft.openai.model, 'OpenAI model'),
      }

      if (draft.openai.secretMode === 'replace') {
        payload.openai.api_key = requireText(draft.openai.apiKey, 'OpenAI API key')
      } else if (!draft.openai.hasStoredAPIKey) {
        throw new Error('OpenAI API key is required before saving this provider.')
      }

      return payload
    case 'proxy':
      payload.proxy = {
        model: requireText(draft.proxy.model, 'Proxy model'),
        channels: draft.proxy.channels.map((channelDraft) => {
          const channelPayload = buildProxyChannelPayload(channelDraft)

          if (channelDraft.keyMode === 'replace') {
            return {
              ...channelPayload,
              api_keys: buildEnabledAPIKeys(channelDraft.apiKeysText),
            }
          }

          return channelPayload
        }),
      }
      return payload
    default:
      throw new Error(`Unsupported provider kind: ${draft.kind}`)
  }
}
