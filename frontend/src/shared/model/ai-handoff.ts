import { createEvent, createStore } from 'effector'

export type AiPromptHandoffRequest = {
  context_widget_ids?: string[]
  prompt: string
  submit?: boolean
}

export type AiPromptHandoff = AiPromptHandoffRequest & {
  request_id: number
}

let aiPromptHandoffSequence = 0

function nextAiPromptHandoffID() {
  aiPromptHandoffSequence += 1
  return aiPromptHandoffSequence
}

export const queueAiPromptHandoff = createEvent<AiPromptHandoffRequest>()
export const consumeAiPromptHandoff = createEvent<number>()
export const clearAiPromptHandoff = createEvent()

export const $queuedAiPromptHandoff = createStore<AiPromptHandoff | null>(null)
  .on(queueAiPromptHandoff, (_current, request) => ({
    ...request,
    context_widget_ids: request.context_widget_ids?.filter((widgetID) => widgetID.trim() !== ''),
    request_id: nextAiPromptHandoffID(),
  }))
  .on(consumeAiPromptHandoff, (current, requestID) => (current?.request_id === requestID ? null : current))
  .reset(clearAiPromptHandoff)
