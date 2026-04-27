import type {
  AgentConversationContextPreferences,
  AgentConversationSnapshot,
  AgentConversationSummary,
} from '@/features/agent/api/client'
import type { AiContextWidgetOption } from '@/features/agent/model/types'
import type { WorkspaceWidgetSnapshot } from '@/shared/api/workspace'

export function deduplicateWidgetIDs(widgetIDs: string[]) {
  return widgetIDs.reduce<string[]>((accumulator, widgetID) => {
    const trimmedWidgetID = widgetID.trim()

    if (!trimmedWidgetID || accumulator.includes(trimmedWidgetID)) {
      return accumulator
    }

    return [...accumulator, trimmedWidgetID]
  }, [])
}

export function formatContextWidgetLabel(widget: WorkspaceWidgetSnapshot) {
  const title = widget.title?.trim() || widget.id
  const meta = [widget.kind]

  if (widget.connection_id?.trim()) {
    meta.push(widget.connection_id.trim())
  }
  if (widget.path?.trim()) {
    meta.push(widget.path.trim())
  }

  return title === widget.id
    ? `${title} · ${meta.join(' · ')}`
    : `${title} (${widget.id}) · ${meta.join(' · ')}`
}

export function formatContextWidgetGroup(widgetKind: string) {
  switch (widgetKind.trim().toLowerCase()) {
    case 'terminal':
      return 'Terminal widgets'
    case 'commander':
      return 'Commander widgets'
    case 'ai':
      return 'AI widgets'
    default: {
      const normalizedKind = widgetKind.trim()
      if (normalizedKind === '') {
        return 'Other widgets'
      }
      return `${normalizedKind.charAt(0).toUpperCase()}${normalizedKind.slice(1)} widgets`
    }
  }
}

export function mapContextWidgetOptions(widgets: WorkspaceWidgetSnapshot[]): AiContextWidgetOption[] {
  return widgets.map((widget) => {
    const title = widget.title?.trim() || widget.id
    const metaParts = [widget.kind]

    if (widget.id !== title) {
      metaParts.unshift(widget.id)
    }
    if (widget.connection_id?.trim()) {
      metaParts.push(widget.connection_id.trim())
    }
    if (widget.path?.trim()) {
      metaParts.push(widget.path.trim())
    }

    return {
      group: formatContextWidgetGroup(widget.kind),
      value: widget.id,
      label: formatContextWidgetLabel(widget),
      title,
      meta: metaParts.join(' · '),
    }
  })
}

export function filterContextWidgetSelection(
  selectedWidgetIDs: string[],
  widgetOptions: AiContextWidgetOption[],
) {
  const availableWidgetIDs = new Set(widgetOptions.map((option) => option.value))
  return deduplicateWidgetIDs(selectedWidgetIDs).filter((widgetID) => availableWidgetIDs.has(widgetID))
}

export function isTerminalWorkspaceWidget(widget: WorkspaceWidgetSnapshot) {
  return widget.kind.trim().toLowerCase() === 'terminal'
}

export function resolveContextTerminalWidget(
  widgets: WorkspaceWidgetSnapshot[],
  candidateWidgetIDs: string[],
): WorkspaceWidgetSnapshot | null {
  const widgetsByID = new Map(widgets.map((widget) => [widget.id, widget]))

  for (const widgetID of deduplicateWidgetIDs(candidateWidgetIDs)) {
    const widget = widgetsByID.get(widgetID)
    if (widget && isTerminalWorkspaceWidget(widget)) {
      return widget
    }
  }

  return null
}

export function summaryFromConversationSnapshot(
  snapshot: AgentConversationSnapshot,
): AgentConversationSummary {
  return {
    archived_at: snapshot.archived_at,
    id: snapshot.id,
    title: snapshot.title,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
    message_count: snapshot.messages.length,
  }
}

export function isCustomizedContextPreference(preferences: AgentConversationContextPreferences) {
  return !preferences.widget_context_enabled || (preferences.widget_ids?.length ?? 0) > 0
}

export function sortConversationSummaries(conversations: AgentConversationSummary[]) {
  return [...conversations].sort((left, right) => {
    const leftArchivedAt = left.archived_at?.trim() ?? ''
    const rightArchivedAt = right.archived_at?.trim() ?? ''

    if (!leftArchivedAt && rightArchivedAt) {
      return -1
    }

    if (leftArchivedAt && !rightArchivedAt) {
      return 1
    }

    const leftSortKey = leftArchivedAt || left.updated_at
    const rightSortKey = rightArchivedAt || right.updated_at
    const updatedAtDelta = new Date(rightSortKey).getTime() - new Date(leftSortKey).getTime()

    if (updatedAtDelta !== 0) {
      return updatedAtDelta
    }

    return right.id.localeCompare(left.id)
  })
}

export function upsertConversationSummary(
  conversations: AgentConversationSummary[],
  nextConversation: AgentConversationSummary,
) {
  const nextConversations = conversations.filter((conversation) => conversation.id !== nextConversation.id)
  nextConversations.push(nextConversation)
  return sortConversationSummaries(nextConversations)
}
