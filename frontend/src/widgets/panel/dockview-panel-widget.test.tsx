import { render } from '@testing-library/react'
import type { IDockviewPanelProps } from 'dockview-react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DockviewPanelWidget } from '@/widgets/panel/dockview-panel-widget'

const terminalWidgetMock = vi.hoisted(() => vi.fn(() => null))
const setActiveWidgetHostIdMock = vi.hoisted(() => vi.fn())
const registerTerminalPanelBindingMock = vi.hoisted(() => vi.fn())
const unregisterTerminalPanelBindingMock = vi.hoisted(() => vi.fn())

vi.mock('effector-react', () => ({
  useUnit: () => [null, setActiveWidgetHostIdMock],
}))

vi.mock('@/features/terminal/model/panel-registry', () => ({
  registerTerminalPanelBinding: registerTerminalPanelBindingMock,
  unregisterTerminalPanelBinding: unregisterTerminalPanelBindingMock,
}))

vi.mock('@/widgets/terminal/terminal-widget', () => ({
  TerminalWidget: terminalWidgetMock,
}))

vi.mock('@/widgets/commander/commander-panel-widget', () => ({
  CommanderPanelWidget: () => null,
}))

vi.mock('@/widgets/files', () => ({
  FilesPanelWidget: () => null,
  resolveFilesPanelParams: () => null,
}))

vi.mock('@/widgets/preview', () => ({
  PreviewPanelWidget: () => null,
  createPreviewPanelParams: vi.fn(),
  resolvePreviewPanelParams: () => null,
}))

vi.mock('@/widgets/panel/modal-host-widget', () => ({
  ModalHostWidget: () => null,
}))

vi.mock('@/widgets/panel/panel-modal-actions-widget', () => ({
  PanelModalActionsWidget: () => null,
}))

vi.mock('@/widgets/panel/widget-busy-overlay-widget', () => ({
  WidgetBusyOverlayWidget: () => null,
}))

function createDisposable() {
  return { dispose: vi.fn() }
}

function createTerminalPanelProps(panelCount: number): IDockviewPanelProps {
  return {
    api: {
      id: 'terminal',
      group: {
        activePanel: { id: 'terminal' },
        panels: Array.from({ length: panelCount }, (_, index) => ({ id: `panel-${index}` })),
        api: {
          onDidActivePanelChange: vi.fn(() => createDisposable()),
        },
      },
      onDidGroupChange: vi.fn(() => createDisposable()),
    },
    containerApi: {
      addPanel: vi.fn(),
    },
    params: {
      preset: 'workspace',
      title: 'Workspace shell',
      widgetId: 'term-side',
    },
  } as unknown as IDockviewPanelProps
}

describe('DockviewPanelWidget', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('moves terminal chrome into the Dockview header for single-panel terminal groups', () => {
    render(<DockviewPanelWidget {...createTerminalPanelProps(1)} />)

    expect(terminalWidgetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: 'terminal',
        preferDockviewHeaderChrome: true,
        runtimeWidgetId: 'term-side',
        title: 'Workspace shell',
      }),
      undefined,
    )
  })

  it('keeps inline terminal chrome when a terminal group has multiple panels', () => {
    render(<DockviewPanelWidget {...createTerminalPanelProps(2)} />)

    expect(terminalWidgetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preferDockviewHeaderChrome: false,
      }),
      undefined,
    )
  })
})
