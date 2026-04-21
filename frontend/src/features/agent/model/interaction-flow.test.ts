import { describe, expect, it } from 'vitest'

import { classifyMessageIntent } from '@/features/agent/model/interaction-flow'

describe('classifyMessageIntent', () => {
  it('classifies plain greetings as chat with no tools', () => {
    expect(classifyMessageIntent('Hello there')).toEqual({
      intent: 'chat',
      tools: [],
    })
    expect(classifyMessageIntent('Привет')).toEqual({
      intent: 'chat',
      tools: [],
    })
  })

  it('classifies tool-backed prompts as execution', () => {
    expect(classifyMessageIntent('Read the file and summarize it').intent).toBe('execution')
    expect(classifyMessageIntent('прочитай файл').intent).toBe('execution')
  })

  it('classifies deployment prompts without an environment as question', () => {
    const classification = classifyMessageIntent('Deploy the current config')

    expect(classification.intent).toBe('question')
    expect(classification.tools.map((tool) => tool.name)).toContain('execute_plan')
  })

  it('reclassifies a clarified deployment prompt as execution', () => {
    expect(classifyMessageIntent('Deploy the current config', 'staging').intent).toBe('execution')
  })
})
