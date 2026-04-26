import { describe, expect, it } from 'vitest'

import type { AgentConversationMessage } from '@/features/agent/api/client'
import { applyAgentConversationStreamEvent } from '@/features/agent/model/panel-state'

describe('applyAgentConversationStreamEvent', () => {
  it('accumulates reasoning and tool-call stream parts on the active assistant message', () => {
    const messages: AgentConversationMessage[] = [
      {
        id: 'msg_1',
        role: 'assistant',
        content: '',
        status: 'streaming',
        provider: 'codex',
        model: 'gpt-5.4',
        created_at: '2026-04-26T10:00:00Z',
      },
    ]

    const withReasoning = applyAgentConversationStreamEvent(messages, {
      type: 'reasoning-delta',
      message_id: 'msg_1',
      delta: 'Inspecting backend state.',
    })
    const withToolCall = applyAgentConversationStreamEvent(withReasoning, {
      type: 'tool-call',
      message_id: 'msg_1',
      tool_call: {
        id: 'tool_1',
        kind: 'command_execution',
        name: 'command_execution',
        status: 'completed',
        summary: 'ls -la',
        input: 'ls -la',
        output: 'file1',
        exit_code: 0,
      },
    })
    const withText = applyAgentConversationStreamEvent(withToolCall, {
      type: 'text-delta',
      message_id: 'msg_1',
      delta: 'hello world',
    })

    expect(withText[0]).toMatchObject({
      id: 'msg_1',
      content: 'hello world',
      status: 'streaming',
      reasoning: 'Inspecting backend state.\n\nTool completed: ls -la\nOutput: file1\nExit code: 0',
    })
  })
})
