import type {
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

/** Moves the pane cursor by a delta and resets the range-selection anchor to that row. */
export function movePaneCursor(paneState: CommanderPaneRuntimeState, delta: number) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  const currentCursorIndex = paneState.cursorEntryId
    ? paneState.entries.findIndex((entry) => entry.id === paneState.cursorEntryId)
    : -1
  const startIndex = currentCursorIndex === -1 ? 0 : currentCursorIndex
  const nextCursorIndex = Math.min(paneState.entries.length - 1, Math.max(0, startIndex + delta))

  return {
    ...paneState,
    cursorEntryId: paneState.entries[nextCursorIndex]?.id ?? null,
    selectionAnchorEntryId: paneState.entries[nextCursorIndex]?.id ?? null,
  }
}

/** Jumps the pane cursor to the start or end of the visible rows. */
export function setCursorToBoundary(paneState: CommanderPaneRuntimeState, boundary: 'start' | 'end') {
  if (paneState.entries.length === 0) {
    return paneState
  }

  return {
    ...paneState,
    cursorEntryId:
      boundary === 'start'
        ? (paneState.entries[0]?.id ?? null)
        : (paneState.entries[paneState.entries.length - 1]?.id ?? null),
    selectionAnchorEntryId:
      boundary === 'start'
        ? (paneState.entries[0]?.id ?? null)
        : (paneState.entries[paneState.entries.length - 1]?.id ?? null),
  }
}

/** Moves the cursor while preserving and extending the current selection range. */
export function movePaneCursorWithSelection(paneState: CommanderPaneRuntimeState, delta: number) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  const currentCursorIndex = paneState.cursorEntryId
    ? paneState.entries.findIndex((entry) => entry.id === paneState.cursorEntryId)
    : -1
  const startIndex = currentCursorIndex === -1 ? 0 : currentCursorIndex
  const nextCursorIndex = Math.min(paneState.entries.length - 1, Math.max(0, startIndex + delta))
  const nextCursorEntryId = paneState.entries[nextCursorIndex]?.id ?? null

  if (!nextCursorEntryId) {
    return paneState
  }

  return setSelectionRangeAtCursor(paneState, nextCursorEntryId)
}

/** Recomputes the contiguous selected range between the current anchor and a target row. */
export function setSelectionRangeAtCursor(paneState: CommanderPaneRuntimeState, targetEntryId: string) {
  const targetIndex = paneState.entries.findIndex((entry) => entry.id === targetEntryId)

  if (targetIndex === -1) {
    return paneState
  }

  const anchorEntryId = paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? targetEntryId
  const anchorIndex = paneState.entries.findIndex((entry) => entry.id === anchorEntryId)
  const resolvedAnchorIndex = anchorIndex === -1 ? targetIndex : anchorIndex
  const [rangeStartIndex, rangeEndIndex] =
    resolvedAnchorIndex <= targetIndex
      ? [resolvedAnchorIndex, targetIndex]
      : [targetIndex, resolvedAnchorIndex]
  const selectedIds = paneState.entries.slice(rangeStartIndex, rangeEndIndex + 1).map((entry) => entry.id)

  return {
    ...paneState,
    cursorEntryId: targetEntryId,
    selectionAnchorEntryId: paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? targetEntryId,
    selectedIds,
  }
}

/** Extends the current selection range to the first or last visible row. */
export function setCursorToBoundaryWithSelection(
  paneState: CommanderPaneRuntimeState,
  boundary: 'start' | 'end',
) {
  if (paneState.entries.length === 0) {
    return paneState
  }

  const targetEntryId =
    boundary === 'start'
      ? (paneState.entries[0]?.id ?? null)
      : (paneState.entries[paneState.entries.length - 1]?.id ?? null)

  if (!targetEntryId) {
    return paneState
  }

  return setSelectionRangeAtCursor(paneState, targetEntryId)
}

/** Toggles one entry inside the pane selection set and makes it the next range anchor. */
export function toggleEntrySelection(paneState: CommanderPaneRuntimeState, entryId: string) {
  if (!paneState.entries.some((entry) => entry.id === entryId)) {
    return paneState
  }

  const selectedIds = paneState.selectedIds.includes(entryId)
    ? paneState.selectedIds.filter((selectedId) => selectedId !== entryId)
    : [...paneState.selectedIds, entryId]

  return {
    ...paneState,
    selectedIds,
    selectionAnchorEntryId: entryId,
  }
}

function escapeCommanderMaskRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitCommanderMaskPatterns(mask: string) {
  return mask
    .split(/[;,]+|\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function commanderMaskPatternToRegExp(pattern: string) {
  const normalizedPattern = pattern.trim()

  if (!normalizedPattern) {
    return null
  }

  const expression = normalizedPattern
    .split('')
    .map((char) => {
      if (char === '*') {
        return '.*'
      }

      if (char === '?') {
        return '.'
      }

      return escapeCommanderMaskRegExp(char)
    })
    .join('')

  return new RegExp(`^${expression}$`, 'i')
}

/** Matches entries against the commander wildcard grammar used by selection and filter flows. */
export function getCommanderMatchedEntries<T extends { id: string; name: string }>(
  entries: T[],
  mask: string,
  options?: {
    emptyMeansAll?: boolean
  },
) {
  const expressions = splitCommanderMaskPatterns(mask)
    .map((pattern) => commanderMaskPatternToRegExp(pattern))
    .filter((expression): expression is RegExp => Boolean(expression))

  if (expressions.length === 0) {
    if (options?.emptyMeansAll) {
      return entries
    }

    return []
  }

  return entries.filter((entry) => expressions.some((expression) => expression.test(entry.name)))
}

/** Convenience wrapper that keeps mask-based filtering terminology at the call site. */
export function filterEntriesByMask<T extends { id: string; name: string }>(
  entries: T[],
  mask: string,
  options?: {
    emptyMeansAll?: boolean
  },
) {
  return getCommanderMatchedEntries(entries, mask, options)
}

/** Returns the ids and names matched by a selection-mask prompt against visible pane rows. */
export function getCommanderMaskMatches(paneState: CommanderPaneRuntimeState, mask: string) {
  const matchedEntries = getCommanderMatchedEntries(paneState.entries, mask)

  if (matchedEntries.length === 0) {
    return {
      entryIds: [] as string[],
      entryNames: [] as string[],
    }
  }

  return {
    entryIds: matchedEntries.map((entry) => entry.id),
    entryNames: matchedEntries.map((entry) => entry.name),
  }
}

/** Returns the ids and names matched by a filter prompt against the unfiltered directory snapshot. */
export function getCommanderFilterMatches(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  mask: string,
) {
  const paneState = paneId === 'left' ? widgetState.leftPane : widgetState.rightPane
  const visibleEntries = paneState.directoryEntries.filter((entry) => widgetState.showHidden || !entry.hidden)
  const matchedEntries = getCommanderMatchedEntries(visibleEntries, mask, { emptyMeansAll: true })

  return {
    entryIds: matchedEntries.map((entry) => entry.id),
    entryNames: matchedEntries.map((entry) => entry.name),
  }
}

/** Returns visible-row matches for the transient quick-search flow. */
export function getCommanderSearchMatches(paneState: CommanderPaneRuntimeState, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return {
      entryIds: [] as string[],
      entryNames: [] as string[],
    }
  }

  const matchedEntries = paneState.entries.filter((entry) =>
    entry.name.toLocaleLowerCase().includes(normalizedQuery),
  )

  return {
    entryIds: matchedEntries.map((entry) => entry.id),
    entryNames: matchedEntries.map((entry) => entry.name),
  }
}

/** Resolves a stable quick-search hit index against the current cursor and visible matches. */
export function getCommanderResolvedSearchMatchIndex(
  entryIds: string[],
  cursorEntryId: string | null,
  fallbackIndex = 0,
) {
  if (entryIds.length === 0) {
    return -1
  }

  if (cursorEntryId) {
    const cursorIndex = entryIds.findIndex((entryId) => entryId === cursorEntryId)

    if (cursorIndex !== -1) {
      return cursorIndex
    }
  }

  return Math.max(0, Math.min(fallbackIndex, entryIds.length - 1))
}

/** Applies a select or unselect mask directly to one pane runtime state. */
export function applySelectionMaskToPane(
  paneState: CommanderPaneRuntimeState,
  mask: string,
  mode: 'select' | 'unselect',
) {
  const matches = getCommanderMaskMatches(paneState, mask)
  const matchedIdSet = new Set(matches.entryIds)

  const nextSelectedIds =
    mode === 'select'
      ? paneState.entries
          .filter((entry) => paneState.selectedIds.includes(entry.id) || matchedIdSet.has(entry.id))
          .map((entry) => entry.id)
      : paneState.selectedIds.filter((entryId) => !matchedIdSet.has(entryId))

  return {
    ...paneState,
    selectedIds: nextSelectedIds,
    selectionAnchorEntryId:
      paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? nextSelectedIds[0] ?? null,
  }
}

/** Inverts selection across the currently visible rows of one pane. */
export function invertPaneSelection(paneState: CommanderPaneRuntimeState) {
  const selectedIdSet = new Set(paneState.selectedIds)
  const nextSelectedIds = paneState.entries
    .filter((entry) => !selectedIdSet.has(entry.id))
    .map((entry) => entry.id)

  return {
    ...paneState,
    selectedIds: nextSelectedIds,
    selectionAnchorEntryId: paneState.cursorEntryId ?? nextSelectedIds[0] ?? null,
  }
}
