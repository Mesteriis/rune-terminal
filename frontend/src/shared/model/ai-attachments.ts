import { createEvent, createStore } from 'effector'

export type QueuedAiAttachmentReference = {
  id: string
  name: string
  path: string
  mime_type: string
  size: number
  modified_time: number
}

export const queueAiAttachmentReference = createEvent<QueuedAiAttachmentReference>()
export const removeQueuedAiAttachmentReference = createEvent<string>()
export const clearQueuedAiAttachmentReferences = createEvent()

export const $queuedAiAttachmentReferences = createStore<QueuedAiAttachmentReference[]>([])
  .on(queueAiAttachmentReference, (attachments, attachment) => {
    const existingAttachments = attachments.filter(
      (currentAttachment) => currentAttachment.id !== attachment.id,
    )

    return [...existingAttachments, attachment]
  })
  .on(removeQueuedAiAttachmentReference, (attachments, attachmentID) =>
    attachments.filter((attachment) => attachment.id !== attachmentID),
  )
  .reset(clearQueuedAiAttachmentReferences)
