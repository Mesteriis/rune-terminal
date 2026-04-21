import { describe, expect, it } from 'vitest'

import {
  buildCreateProviderPayload,
  buildUpdateProviderPayload,
  createEmptyProviderDraft,
  createProviderDraftFromView,
} from '@/features/agent/model/provider-settings-draft'

describe('provider settings draft helpers', () => {
  it('serializes codex providers without asking for an API key', () => {
    const draft = createEmptyProviderDraft('codex')
    draft.displayName = 'Codex'
    draft.codex.model = 'gpt-5-codex'
    draft.codex.authFilePath = '~/.codex/auth.json'

    expect(buildCreateProviderPayload(draft)).toEqual({
      kind: 'codex',
      display_name: 'Codex',
      enabled: true,
      codex: {
        model: 'gpt-5-codex',
        auth_file_path: '~/.codex/auth.json',
      },
    })
  })

  it('preserves masked proxy secrets when an existing channel is updated without replacement keys', () => {
    const draft = createProviderDraftFromView({
      id: 'provider-1',
      kind: 'proxy',
      display_name: 'Proxy',
      enabled: true,
      active: false,
      proxy: {
        model: 'assistant-default',
        channels: [
          {
            id: 'codex-primary',
            name: 'Codex',
            service_type: 'openai',
            base_url: 'https://example.com/v1',
            key_count: 2,
            enabled_key_count: 1,
          },
        ],
      },
      created_at: '2026-04-21T10:00:00Z',
      updated_at: '2026-04-21T10:00:00Z',
    })

    draft.proxy.channels[0] = {
      ...draft.proxy.channels[0],
      name: 'Codex EU',
      baseURL: 'https://example.eu/v1',
    }

    expect(buildUpdateProviderPayload(draft)).toEqual({
      display_name: 'Proxy',
      enabled: true,
      proxy: {
        model: 'assistant-default',
        channels: [
          {
            id: 'codex-primary',
            name: 'Codex EU',
            service_type: 'openai',
            base_url: 'https://example.eu/v1',
            status: 'active',
          },
        ],
      },
    })
  })

  it('serializes replacement proxy keys for new providers', () => {
    const draft = createEmptyProviderDraft('proxy')
    draft.displayName = 'Proxy'
    draft.proxy.model = 'assistant-default'
    draft.proxy.channels[0] = {
      ...draft.proxy.channels[0],
      id: 'claude-primary',
      name: 'Claude main',
      serviceType: 'claude',
      baseURL: 'https://claude.example.com',
      apiKeysText: 'key-1\nkey-2',
    }

    expect(buildCreateProviderPayload(draft)).toEqual({
      kind: 'proxy',
      display_name: 'Proxy',
      enabled: true,
      proxy: {
        model: 'assistant-default',
        channels: [
          {
            id: 'claude-primary',
            name: 'Claude main',
            service_type: 'claude',
            base_url: 'https://claude.example.com',
            api_keys: [
              { key: 'key-1', enabled: true },
              { key: 'key-2', enabled: true },
            ],
            status: 'active',
          },
        ],
      },
    })
  })
})
