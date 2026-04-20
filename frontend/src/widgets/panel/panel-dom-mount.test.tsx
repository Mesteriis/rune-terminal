import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAllAiBlockedWidgets, toggleAiBlockedWidget } from '@/shared/model/ai-blocked-widgets'
import { closeAllModals, openWidgetModal } from '@/shared/model/modal'
import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'

vi.mock('@tsparticles/react', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-particles" />,
  initParticlesEngine: vi.fn(async (loader: (engine: unknown) => Promise<void>) => {
    await loader({})
  }),
}))

vi.mock('tsparticles', () => ({
  loadFull: vi.fn(async () => {}),
}))

describe('panel DOM mount props', () => {
  beforeEach(() => {
    closeAllModals()
    clearAllAiBlockedWidgets()
  })

  afterEach(() => {
    closeAllModals()
    clearAllAiBlockedWidgets()
  })

  it('renders widget-scoped modals into the provided mount node', () => {
    const mountNode = document.createElement('div')
    document.body.appendChild(mountNode)

    try {
      const view = render(<ModalHostWidget hostId="widget-1" mountNode={mountNode} scope="widget" />)

      act(() => {
        openWidgetModal({
          description: 'Widget modal description',
          hostId: 'widget-1',
          title: 'Widget modal title',
        })
      })

      expect(within(view.container).queryByText('Widget modal title')).toBeNull()
      expect(within(mountNode).getByText('Widget modal title')).toBeInTheDocument()
      expect(screen.getByText('Widget modal description')).toBeInTheDocument()
    } finally {
      mountNode.remove()
    }
  })

  it('renders busy overlays into the provided mount node', async () => {
    const mountNode = document.createElement('div')
    document.body.appendChild(mountNode)

    try {
      render(<WidgetBusyOverlayWidget hostId="widget-2" mountNode={mountNode} />)

      await act(async () => {
        toggleAiBlockedWidget('widget-2')
      })

      expect(within(mountNode).getByLabelText('Widget widget-2 is busy')).toBeInTheDocument()
    } finally {
      mountNode.remove()
    }
  })
})
