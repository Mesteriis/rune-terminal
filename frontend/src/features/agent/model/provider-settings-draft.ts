import type {
  AgentProviderKind,
  AgentProviderView,
  CreateAgentProviderPayload,
  UpdateAgentProviderPayload,
} from '@/features/agent/api/provider-client'

const DEFAULT_CODEX_COMMAND = 'codex'
const DEFAULT_CODEX_MODEL = 'gpt-5.4'
const DEFAULT_CLAUDE_COMMAND = 'claude'
const DEFAULT_CLAUDE_MODEL = 'sonnet'
const DEFAULT_OPENAI_COMPATIBLE_BASE_URL = 'http://127.0.0.1:8317'
const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'gpt-5.4'

function normalizeText(value: string) {
  return value.trim()
}

function requireText(value: string, label: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    throw new Error(`${label} is required.`)
  }

  return normalized
}

export type AgentProviderDraftMode = 'existing' | 'new'

export type AgentProviderDraft = {
  mode: AgentProviderDraftMode
  id?: string
  kind: AgentProviderKind
  displayName: string
  enabled: boolean
  codex: {
    command: string
    model: string
  }
  claude: {
    command: string
    model: string
  }
  openAICompatible: {
    baseURL: string
    model: string
  }
}

export function createEmptyProviderDraft(kind: AgentProviderKind): AgentProviderDraft {
  return {
    mode: 'new',
    kind,
    displayName: '',
    enabled: true,
    codex: {
      command: DEFAULT_CODEX_COMMAND,
      model: DEFAULT_CODEX_MODEL,
    },
    claude: {
      command: DEFAULT_CLAUDE_COMMAND,
      model: DEFAULT_CLAUDE_MODEL,
    },
    openAICompatible: {
      baseURL: DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
      model: DEFAULT_OPENAI_COMPATIBLE_MODEL,
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
    codex: {
      command: provider.codex?.command ?? DEFAULT_CODEX_COMMAND,
      model: provider.codex?.model ?? DEFAULT_CODEX_MODEL,
    },
    claude: {
      command: provider.claude?.command ?? DEFAULT_CLAUDE_COMMAND,
      model: provider.claude?.model ?? DEFAULT_CLAUDE_MODEL,
    },
    openAICompatible: {
      baseURL: provider.openai_compatible?.base_url ?? DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
      model: provider.openai_compatible?.model ?? DEFAULT_OPENAI_COMPATIBLE_MODEL,
    },
  }
}

export function buildCreateProviderPayload(draft: AgentProviderDraft): CreateAgentProviderPayload {
  const payload: CreateAgentProviderPayload = {
    kind: draft.kind,
    display_name: normalizeText(draft.displayName),
    enabled: draft.enabled,
  }

  switch (draft.kind) {
    case 'codex':
      payload.codex = {
        command: requireText(draft.codex.command, 'Codex command'),
        model: requireText(draft.codex.model, 'Codex model'),
      }
      return payload
    case 'claude':
      payload.claude = {
        command: requireText(draft.claude.command, 'Claude command'),
        model: requireText(draft.claude.model, 'Claude model'),
      }
      return payload
    case 'openai-compatible':
      payload.openai_compatible = {
        base_url: requireText(draft.openAICompatible.baseURL, 'Source URL'),
        model: requireText(draft.openAICompatible.model, 'Source model'),
      }
      return payload
    default:
      throw new Error(`Unsupported provider kind: ${draft.kind satisfies never}`)
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
    case 'codex':
      payload.codex = {
        command: requireText(draft.codex.command, 'Codex command'),
        model: requireText(draft.codex.model, 'Codex model'),
      }
      return payload
    case 'claude':
      payload.claude = {
        command: requireText(draft.claude.command, 'Claude command'),
        model: requireText(draft.claude.model, 'Claude model'),
      }
      return payload
    case 'openai-compatible':
      payload.openai_compatible = {
        base_url: requireText(draft.openAICompatible.baseURL, 'Source URL'),
        model: requireText(draft.openAICompatible.model, 'Source model'),
      }
      return payload
    default:
      throw new Error(`Unsupported provider kind: ${draft.kind satisfies never}`)
  }
}
