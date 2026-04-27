import {
  fetchAgentConversation,
  updateAgentConversationContext,
  type AgentConversationContextPreferences,
  type AgentConversationSnapshot,
} from '@/features/agent/api/client'
import {
  deduplicateWidgetIDs,
  filterContextWidgetSelection,
  mapContextWidgetOptions,
} from '@/features/agent/model/agent-panel-context'
import type { AiContextWidgetOption } from '@/features/agent/model/types'
import { fetchWorkspaceSnapshot, type WorkspaceWidgetSnapshot } from '@/shared/api/workspace'

type ContextRuntimeDeps = {
  deduplicateWidgetIDs: typeof deduplicateWidgetIDs
  fetchAgentConversation: typeof fetchAgentConversation
  fetchWorkspaceSnapshot: typeof fetchWorkspaceSnapshot
  filterContextWidgetSelection: typeof filterContextWidgetSelection
  mapContextWidgetOptions: typeof mapContextWidgetOptions
  updateAgentConversationContext: typeof updateAgentConversationContext
}

const defaultDeps: ContextRuntimeDeps = {
  deduplicateWidgetIDs,
  fetchAgentConversation,
  fetchWorkspaceSnapshot,
  filterContextWidgetSelection,
  mapContextWidgetOptions,
  updateAgentConversationContext,
}

type EnsureCurrentConversationSnapshotLoadedInput = {
  activeConversationID: string
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  hasMessagesLoaded: boolean
  refreshConversationList: () => Promise<unknown>
}

export async function ensureCurrentConversationSnapshotLoadedForPanel(
  input: EnsureCurrentConversationSnapshotLoadedInput,
  deps: ContextRuntimeDeps = defaultDeps,
) {
  if (input.activeConversationID.trim() && input.hasMessagesLoaded) {
    return
  }

  const snapshot = await deps.fetchAgentConversation()
  input.applyConversationSnapshot(snapshot)
  await input.refreshConversationList()
}

type PersistConversationContextPreferencesInput = {
  activeConversationID: string
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  preferences: AgentConversationContextPreferences
  refreshConversationList: () => Promise<unknown>
}

export async function persistConversationContextPreferencesForPanel(
  input: PersistConversationContextPreferencesInput,
  deps: ContextRuntimeDeps = defaultDeps,
) {
  let conversationID = input.activeConversationID.trim()

  if (!conversationID) {
    const currentSnapshot = await deps.fetchAgentConversation()
    input.applyConversationSnapshot(currentSnapshot)
    conversationID = currentSnapshot.id.trim()
  }

  if (!conversationID) {
    return
  }

  const snapshot = await deps.updateAgentConversationContext(conversationID, input.preferences)
  input.applyConversationSnapshot(snapshot)
  await input.refreshConversationList()
}

type PersistCleanedContextWidgetSelectionInput = {
  hasCustomizedContextWidgetSelection: boolean
  isWidgetContextEnabled: boolean
  options: AiContextWidgetOption[]
  persistConversationContextPreferences: (preferences: AgentConversationContextPreferences) => Promise<void>
  setMissingContextWidgetCount: (count: number) => void
  setStoredContextWidgetIDs: (widgetIDs: string[]) => void
  storedContextWidgetIDs: string[]
}

export async function persistCleanedContextWidgetSelectionForPanel(
  input: PersistCleanedContextWidgetSelectionInput,
  deps: ContextRuntimeDeps = defaultDeps,
) {
  if (!input.hasCustomizedContextWidgetSelection) {
    return false
  }

  const normalizedSelection = deps.deduplicateWidgetIDs(input.storedContextWidgetIDs)
  if (normalizedSelection.length === 0) {
    return false
  }

  const cleanedWidgetIDs = deps.filterContextWidgetSelection(normalizedSelection, input.options)
  if (cleanedWidgetIDs.length === normalizedSelection.length) {
    return false
  }

  input.setStoredContextWidgetIDs(cleanedWidgetIDs)
  input.setMissingContextWidgetCount(0)
  await input.persistConversationContextPreferences({
    widget_context_enabled: input.isWidgetContextEnabled,
    widget_ids: cleanedWidgetIDs,
  })
  return true
}

export type LoadedContextWidgetsSnapshot = {
  activeWidgetID: string
  options: AiContextWidgetOption[]
  widgets: WorkspaceWidgetSnapshot[]
}

type LoadContextWidgetsInput = {
  enabled: boolean
  hasCustomizedContextWidgetSelection: boolean
  hasLoadedContextWidgets: boolean
  setContextWidgetLoadError: (error: string | null) => void
  setContextWidgetOptions: (options: AiContextWidgetOption[]) => void
  setMissingContextWidgetCount: (updater: number | ((currentMissingCount: number) => number)) => void
  setWorkspaceActiveWidgetID: (widgetID: string) => void
  storedContextWidgetIDs: string[]
  workspaceActiveWidgetID: string
  workspaceWidgets: WorkspaceWidgetSnapshot[]
  contextWidgetOptions: AiContextWidgetOption[]
}

export async function loadContextWidgetsForPanel(
  input: LoadContextWidgetsInput,
  deps: ContextRuntimeDeps = defaultDeps,
): Promise<LoadedContextWidgetsSnapshot> {
  if (!input.enabled) {
    return {
      activeWidgetID: '',
      options: [],
      widgets: [],
    }
  }

  if (input.hasLoadedContextWidgets) {
    return {
      activeWidgetID: input.workspaceActiveWidgetID,
      options: input.contextWidgetOptions,
      widgets: input.workspaceWidgets,
    }
  }

  const workspaceSnapshot = await deps.fetchWorkspaceSnapshot()
  const nextContextWidgetOptions = deps.mapContextWidgetOptions(workspaceSnapshot.widgets)
  const nextWorkspaceActiveWidgetID = workspaceSnapshot.active_widget_id?.trim() ?? ''

  input.setWorkspaceActiveWidgetID(nextWorkspaceActiveWidgetID)
  input.setContextWidgetOptions(nextContextWidgetOptions)
  input.setContextWidgetLoadError(null)
  input.setMissingContextWidgetCount((currentMissingCount: number) => {
    if (input.hasCustomizedContextWidgetSelection) {
      const normalizedSelection = deps.deduplicateWidgetIDs(input.storedContextWidgetIDs)
      const filteredSelection = deps.filterContextWidgetSelection(
        normalizedSelection,
        nextContextWidgetOptions,
      )
      return Math.max(0, normalizedSelection.length - filteredSelection.length)
    }

    return currentMissingCount > 0 ? 0 : currentMissingCount
  })

  return {
    activeWidgetID: nextWorkspaceActiveWidgetID,
    options: nextContextWidgetOptions,
    widgets: workspaceSnapshot.widgets,
  }
}
