import type { CommanderWidgetRuntimeState } from '@/features/commander/model/types'

type CommanderWidgetScopedPayload = {
  widgetId: string
}

type CommanderWidgetsState = Record<string, CommanderWidgetRuntimeState>

type CommanderWidgetStateUpdater<Payload extends CommanderWidgetScopedPayload> = (
  widgetState: CommanderWidgetRuntimeState,
  payload: Payload,
) => CommanderWidgetRuntimeState | null | undefined

export function withCommanderWidgetState<Payload extends CommanderWidgetScopedPayload>(
  widgets: CommanderWidgetsState,
  payload: Payload,
  updateWidgetState: CommanderWidgetStateUpdater<Payload>,
) {
  const widgetState = widgets[payload.widgetId]

  if (!widgetState) {
    return widgets
  }

  const nextWidgetState = updateWidgetState(widgetState, payload)

  if (!nextWidgetState || nextWidgetState === widgetState) {
    return widgets
  }

  return {
    ...widgets,
    [payload.widgetId]: nextWidgetState,
  }
}
