import { useCallback, useMemo } from 'react'

import {
  deduplicateWidgetIDs,
  filterContextWidgetSelection,
} from '@/features/agent/model/agent-panel-context'
import { getErrorMessage } from '@/features/agent/model/agent-panel-terminal'
import type { AiContextWidgetOption } from '@/features/agent/model/types'
import {
  resolveTerminalPanelBinding,
  type TerminalPanelBindings,
} from '@/features/terminal/model/panel-registry'

type UseAgentPanelContextSelectionInput = {
  activeWidgetHostId: string
  contextWidgetOptions: AiContextWidgetOption[]
  getErrorMessage: typeof getErrorMessage
  isWidgetContextEnabled: boolean
  missingContextWidgetCount: number
  persistConversationContextPreferences: (preferences: {
    widget_context_enabled: boolean
    widget_ids: string[]
  }) => Promise<void>
  setHasCustomizedContextWidgetSelection: (value: boolean) => void
  setIsWidgetContextEnabled: (value: boolean) => void
  setMissingContextWidgetCount: (value: number) => void
  setStoredContextWidgetIDs: (widgetIDs: string[]) => void
  setSubmitError: (value: string | null) => void
  storedContextWidgetIDs: string[]
  terminalPanelBindings: TerminalPanelBindings
  workspaceActiveWidgetID: string
}

export function useAgentPanelContextSelection(input: UseAgentPanelContextSelectionInput) {
  const deriveFallbackContextWidgetIDs = useCallback(
    (nextWorkspaceActiveWidgetID?: string) => {
      const terminalBinding = resolveTerminalPanelBinding(
        input.terminalPanelBindings,
        input.activeWidgetHostId,
      )
      return deduplicateWidgetIDs([
        terminalBinding?.runtimeWidgetId ?? '',
        nextWorkspaceActiveWidgetID ?? input.workspaceActiveWidgetID,
      ])
    },
    [input.activeWidgetHostId, input.terminalPanelBindings, input.workspaceActiveWidgetID],
  )

  const resolveCurrentContextWidgetID = useCallback(
    (options: AiContextWidgetOption[], nextWorkspaceActiveWidgetID?: string) => {
      const availableWidgetIDs = new Set(options.map((option) => option.value))
      return (
        deriveFallbackContextWidgetIDs(nextWorkspaceActiveWidgetID).find((widgetID) =>
          availableWidgetIDs.has(widgetID),
        ) ?? ''
      )
    },
    [deriveFallbackContextWidgetIDs],
  )

  const effectiveContextWidgetIDs = useMemo(() => {
    const filteredSelection =
      input.contextWidgetOptions.length > 0
        ? filterContextWidgetSelection(input.storedContextWidgetIDs, input.contextWidgetOptions)
        : deduplicateWidgetIDs(input.storedContextWidgetIDs)

    if (filteredSelection.length > 0) {
      return filteredSelection
    }

    return deriveFallbackContextWidgetIDs()
  }, [deriveFallbackContextWidgetIDs, input.contextWidgetOptions, input.storedContextWidgetIDs])

  const resolvedMissingContextWidgetCount = useMemo(() => {
    if (input.contextWidgetOptions.length === 0) {
      return input.missingContextWidgetCount
    }

    const normalizedSelection = deduplicateWidgetIDs(input.storedContextWidgetIDs)
    return Math.max(
      0,
      normalizedSelection.length -
        filterContextWidgetSelection(normalizedSelection, input.contextWidgetOptions).length,
    )
  }, [input.contextWidgetOptions, input.missingContextWidgetCount, input.storedContextWidgetIDs])

  const activeContextWidgetID = useMemo(
    () => resolveCurrentContextWidgetID(input.contextWidgetOptions),
    [input.contextWidgetOptions, resolveCurrentContextWidgetID],
  )

  const activeContextWidgetOption = useMemo(() => {
    if (!activeContextWidgetID) {
      return null
    }

    return input.contextWidgetOptions.find((option) => option.value === activeContextWidgetID) ?? null
  }, [activeContextWidgetID, input.contextWidgetOptions])

  const updateSelectedContextWidgetIDs = useCallback(
    (widgetIDs: string[]) => {
      const normalizedWidgetIDs = deduplicateWidgetIDs(widgetIDs)
      input.setHasCustomizedContextWidgetSelection(true)
      input.setStoredContextWidgetIDs(normalizedWidgetIDs)
      input.setIsWidgetContextEnabled(true)
      input.setMissingContextWidgetCount(0)
      void input
        .persistConversationContextPreferences({
          widget_context_enabled: true,
          widget_ids: normalizedWidgetIDs,
        })
        .catch((error) => {
          input.setSubmitError(input.getErrorMessage(error, 'Unable to update the conversation context.'))
        })
    },
    [input],
  )

  const updateWidgetContextEnabled = useCallback(
    (nextValue: boolean) => {
      input.setIsWidgetContextEnabled(nextValue)
      input.setMissingContextWidgetCount(0)
      input.setHasCustomizedContextWidgetSelection(
        !nextValue || deduplicateWidgetIDs(effectiveContextWidgetIDs).length > 0,
      )
      void input
        .persistConversationContextPreferences({
          widget_context_enabled: nextValue,
          widget_ids: deduplicateWidgetIDs(effectiveContextWidgetIDs),
        })
        .catch((error) => {
          input.setSubmitError(input.getErrorMessage(error, 'Unable to update the conversation context.'))
        })
    },
    [effectiveContextWidgetIDs, input],
  )

  const repairMissingContextWidgets = useCallback(() => {
    const nextWidgetIDs = deduplicateWidgetIDs(effectiveContextWidgetIDs)
    input.setHasCustomizedContextWidgetSelection(nextWidgetIDs.length > 0 || !input.isWidgetContextEnabled)
    input.setStoredContextWidgetIDs(nextWidgetIDs)
    input.setMissingContextWidgetCount(0)
    void input
      .persistConversationContextPreferences({
        widget_context_enabled: input.isWidgetContextEnabled,
        widget_ids: nextWidgetIDs,
      })
      .catch((error) => {
        input.setSubmitError(input.getErrorMessage(error, 'Unable to save the cleaned conversation context.'))
      })
  }, [effectiveContextWidgetIDs, input])

  const createConversationContext = useCallback(
    (contextInput: {
      actionSource: string
      activeWidgetID?: string
      includeActiveWidgetInSelection?: boolean
      repoRoot: string
      targetConnectionID?: string
      targetSession?: string
    }) => {
      const selectedWidgetIDs = input.isWidgetContextEnabled ? effectiveContextWidgetIDs : []
      const activeWidgetID =
        contextInput.activeWidgetID?.trim() ||
        selectedWidgetIDs[0] ||
        deriveFallbackContextWidgetIDs()[0] ||
        ''
      const contextWidgetIDs = input.isWidgetContextEnabled
        ? deduplicateWidgetIDs(
            contextInput.includeActiveWidgetInSelection && activeWidgetID
              ? [activeWidgetID, ...selectedWidgetIDs]
              : selectedWidgetIDs,
          )
        : []

      return {
        action_source: contextInput.actionSource,
        active_widget_id: activeWidgetID,
        repo_root: contextInput.repoRoot,
        target_connection_id: contextInput.targetConnectionID,
        target_session: contextInput.targetSession,
        widget_context_enabled: input.isWidgetContextEnabled,
        ...(contextWidgetIDs.length > 0 ? { widget_ids: contextWidgetIDs } : {}),
      }
    },
    [deriveFallbackContextWidgetIDs, effectiveContextWidgetIDs, input.isWidgetContextEnabled],
  )

  const createToolExecutionContext = useCallback(
    (contextInput: Parameters<typeof createConversationContext>[0]) => {
      const conversationContext = createConversationContext(contextInput)

      return {
        action_source: conversationContext.action_source,
        active_widget_id: conversationContext.active_widget_id,
        repo_root: conversationContext.repo_root,
        target_connection_id: conversationContext.target_connection_id,
        target_session: conversationContext.target_session,
      }
    },
    [createConversationContext],
  )

  return {
    activeContextWidgetID,
    activeContextWidgetOption,
    createConversationContext,
    createToolExecutionContext,
    deriveFallbackContextWidgetIDs,
    effectiveContextWidgetIDs,
    repairMissingContextWidgets,
    resolveCurrentContextWidgetID,
    resolvedMissingContextWidgetCount,
    updateSelectedContextWidgetIDs,
    updateWidgetContextEnabled,
  }
}
