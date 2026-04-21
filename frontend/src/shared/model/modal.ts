import { createEvent, createStore } from 'effector'

export const BODY_MODAL_HOST_ID = 'body'

export type ModalDescriptor = {
  id: string
  hostId: string
  title: string
  description: string
  variant?: 'default' | 'settings'
  contentKey?: 'settings-shell' | 'agent-providers'
}

export type OpenModalPayload = Omit<ModalDescriptor, 'id'>

let modalSequence = 0

function createModal(payload: OpenModalPayload): ModalDescriptor {
  modalSequence += 1

  return {
    id: `modal-${modalSequence}`,
    ...payload,
  }
}

export const openModal = createEvent<OpenModalPayload>()
export const openBodyModal = createEvent<Omit<OpenModalPayload, 'hostId'>>()
export const openWidgetModal = createEvent<OpenModalPayload>()
export const closeModal = createEvent<{ id: string }>()
export const closeHostModals = createEvent<{ hostId: string }>()
export const closeAllModals = createEvent()

export const $modals = createStore<ModalDescriptor[]>([])
  .on(openModal, (modals, payload) => [...modals, createModal(payload)])
  .on(openBodyModal, (modals, payload) => [
    ...modals,
    createModal({
      hostId: BODY_MODAL_HOST_ID,
      ...payload,
    }),
  ])
  .on(openWidgetModal, (modals, payload) => [...modals, createModal(payload)])
  .on(closeModal, (modals, payload) => modals.filter((modal) => modal.id !== payload.id))
  .on(closeHostModals, (modals, payload) => modals.filter((modal) => modal.hostId !== payload.hostId))
  .reset(closeAllModals)
