import { describe, expect, it } from 'vitest'

import {
  buildCreateProviderPayload,
  buildUpdateProviderPayload,
  createEmptyProviderDraft,
  createProviderDraftFromView,
} from '@/features/agent/model/provider-settings-draft'

describe('provider settings draft helpers', () => {
  it('serializes codex CLI providers without asking for an API key', () => {
    const draft = createEmptyProviderDraft('codex')
    draft.displayName = 'Codex CLI'
    draft.codex.command = 'codex'
    draft.codex.model = 'gpt-5.4'

    expect(buildCreateProviderPayload(draft)).toEqual({
      kind: 'codex',
      display_name: 'Codex CLI',
      enabled: true,
      codex: {
        command: 'codex',
        model: 'gpt-5.4',
      },
    })
  })

  it('serializes claude CLI providers', () => {
    const draft = createEmptyProviderDraft('claude')
    draft.displayName = 'Claude Code CLI'
    draft.claude.command = 'claude'
    draft.claude.model = 'sonnet'

    expect(buildCreateProviderPayload(draft)).toEqual({
      kind: 'claude',
      display_name: 'Claude Code CLI',
      enabled: true,
      claude: {
        command: 'claude',
        model: 'sonnet',
      },
    })
  })

  it('hydrates existing claude CLI providers from backend views', () => {
    const draft = createProviderDraftFromView({
      id: 'claude-code-cli',
      kind: 'claude',
      display_name: 'Claude Code CLI',
      enabled: true,
      active: false,
      claude: {
        command: 'claude',
        model: 'opus',
        chat_models: ['opus', 'sonnet'],
      },
      created_at: '2026-04-21T10:00:00Z',
      updated_at: '2026-04-21T10:00:00Z',
    })

    draft.claude.model = 'sonnet'

    expect(buildUpdateProviderPayload(draft)).toEqual({
      display_name: 'Claude Code CLI',
      enabled: true,
      claude: {
        command: 'claude',
        model: 'sonnet',
      },
    })
  })
})
