import { z } from 'zod'

import type {
  CommanderClientEntrySnapshot,
  CommanderDirectoryEntry,
  CommanderPanePersistedState,
  CommanderPaneRuntimeState,
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetPersistedState,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

const COMMANDER_WIDGETS_STORAGE_KEY = 'runa-terminal:commander-widgets:v1'

type CommanderPersistenceState = {
  widgets: Record<string, CommanderWidgetPersistedSnapshot>
}

const commanderPaneIdSchema = z.enum(['left', 'right'])
const commanderViewModeSchema = z.enum(['commander', 'split', 'terminal'])
const commanderSortModeSchema = z.enum(['name', 'ext', 'size', 'modified'])
const commanderSortDirectionSchema = z.enum(['asc', 'desc'])
const commanderRowKindSchema = z.enum(['file', 'folder', 'symlink'])
const stringArraySchema = z.array(z.string())

const commanderDirectoryEntrySchema: z.ZodType<CommanderDirectoryEntry> = z.object({
  id: z.string(),
  name: z.string(),
  ext: z.string(),
  kind: commanderRowKindSchema,
  sizeLabel: z.string(),
  sizeBytes: z.number().nullable().optional().default(null),
  modified: z.string(),
  hidden: z.boolean().optional().default(false),
  gitStatus: z.string().optional(),
  executable: z.boolean().optional(),
  symlinkTarget: z.string().optional(),
})

const commanderClientEntrySchema: z.ZodType<CommanderClientEntrySnapshot> = z.object({
  id: z.string().optional(),
  name: z.string(),
  ext: z.string(),
  kind: commanderRowKindSchema,
  sizeLabel: z.string(),
  modified: z.string(),
  hidden: z.boolean().optional(),
  gitStatus: z.string().optional(),
  executable: z.boolean().optional(),
  symlinkTarget: z.string().optional(),
  content: z.string().optional(),
})

const commanderPanePersistedStateSchema: z.ZodType<CommanderPanePersistedState> = z
  .object({
    path: z.string(),
    filterQuery: z.string().optional().default(''),
    entries: z.array(commanderDirectoryEntrySchema),
    cursorEntryId: z.string().nullable().optional(),
    selectionAnchorEntryId: z.string().nullable().optional(),
    selectedIds: stringArraySchema,
    historyBack: stringArraySchema,
    historyForward: stringArraySchema,
  })
  .transform((paneState) => ({
    path: paneState.path,
    filterQuery: paneState.filterQuery,
    entries: paneState.entries,
    cursorEntryId: paneState.cursorEntryId ?? null,
    selectionAnchorEntryId: paneState.selectionAnchorEntryId ?? paneState.cursorEntryId ?? null,
    selectedIds: paneState.selectedIds,
    historyBack: paneState.historyBack,
    historyForward: paneState.historyForward,
  }))

const commanderWidgetPersistedRuntimeSchema: z.ZodType<CommanderWidgetPersistedState> = z.object({
  activePane: commanderPaneIdSchema,
  viewMode: commanderViewModeSchema,
  showHidden: z.boolean(),
  sortMode: commanderSortModeSchema,
  sortDirection: commanderSortDirectionSchema.optional().default('asc'),
  dirsFirst: z.boolean().optional().default(true),
  leftPane: commanderPanePersistedStateSchema,
  rightPane: commanderPanePersistedStateSchema,
})

const commanderWidgetPersistedSnapshotSchema: z.ZodType<CommanderWidgetPersistedSnapshot> = z.object({
  runtime: commanderWidgetPersistedRuntimeSchema,
  client: z.object({
    directories: z.record(z.string(), z.array(commanderClientEntrySchema)),
  }),
})

const commanderPersistenceStateSchema = z.object({
  widgets: z.record(z.string(), z.unknown()).optional().default({}),
})

function normalizeWidgetState(value: unknown): CommanderWidgetPersistedSnapshot | null {
  const parsedWidgetState = commanderWidgetPersistedSnapshotSchema.safeParse(value)

  return parsedWidgetState.success ? parsedWidgetState.data : null
}

function readPersistenceState(): CommanderPersistenceState {
  if (typeof window === 'undefined') {
    return { widgets: {} }
  }

  try {
    const rawValue = window.localStorage.getItem(COMMANDER_WIDGETS_STORAGE_KEY)

    if (!rawValue) {
      return { widgets: {} }
    }

    const parsedValue = commanderPersistenceStateSchema.safeParse(JSON.parse(rawValue))

    if (!parsedValue.success) {
      return { widgets: {} }
    }

    const widgets = Object.fromEntries(
      Object.entries(parsedValue.data.widgets)
        .map(([widgetId, widgetState]) => [widgetId, normalizeWidgetState(widgetState)] as const)
        .filter((entry): entry is [string, CommanderWidgetPersistedSnapshot] => Boolean(entry[1])),
    )

    return { widgets }
  } catch {
    return { widgets: {} }
  }
}

/** Reads one normalized commander widget snapshot from local storage. */
export function readPersistedCommanderWidget(widgetId: string) {
  return readPersistenceState().widgets[widgetId] ?? null
}

/** Writes the full persisted commander widget map back to local storage. */
export function writePersistedCommanderWidgets(widgets: Record<string, CommanderWidgetPersistedSnapshot>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    COMMANDER_WIDGETS_STORAGE_KEY,
    JSON.stringify({ widgets } satisfies CommanderPersistenceState),
  )
}

function serializePaneState(paneState: CommanderPaneRuntimeState): CommanderPanePersistedState {
  return {
    path: paneState.path,
    filterQuery: paneState.filterQuery,
    entries: paneState.entries,
    cursorEntryId: paneState.cursorEntryId,
    selectionAnchorEntryId: paneState.selectionAnchorEntryId,
    selectedIds: paneState.selectedIds,
    historyBack: paneState.historyBack,
    historyForward: paneState.historyForward,
  }
}

/** Serializes runtime-only commander state into the persisted widget schema. */
export function serializeCommanderWidgetRuntimeState(
  widgetState: CommanderWidgetRuntimeState,
): CommanderWidgetPersistedState {
  return {
    activePane: widgetState.activePane,
    viewMode: widgetState.viewMode,
    showHidden: widgetState.showHidden,
    sortMode: widgetState.sortMode,
    sortDirection: widgetState.sortDirection,
    dirsFirst: widgetState.dirsFirst,
    leftPane: serializePaneState(widgetState.leftPane),
    rightPane: serializePaneState(widgetState.rightPane),
  }
}
