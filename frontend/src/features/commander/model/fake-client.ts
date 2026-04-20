import { commanderWidgetMockState } from '../../../widgets/commander-widget.mock'
import type {
  CommanderClientEntrySnapshot,
  CommanderClientSnapshot,
  CommanderDirectoryEntry,
  CommanderDirectorySnapshot,
  CommanderNavigationResult,
  CommanderPaneId,
  CommanderPanePersistedState,
  CommanderRenamePreviewItem,
  CommanderPaneRuntimeState,
  CommanderWidgetPersistedState,
  CommanderSortMode,
  CommanderWidgetRuntimeState,
} from './types'

type CommanderSeedEntry = CommanderClientEntrySnapshot

type CommanderClientState = {
  directories: Map<string, CommanderSeedEntry[]>
}

type CommanderMutationParams = {
  widgetId: string
  path: string
  entryIds: string[]
}

type CommanderEntryNameConflictParams = {
  widgetId: string
  path: string
  name: string
  ignoreEntryId?: string
}

const INITIAL_LEFT_PATH = commanderWidgetMockState.leftPane.path
const INITIAL_RIGHT_PATH = commanderWidgetMockState.rightPane.path
const clients = new Map<string, CommanderClientState>()

function toSeedEntryId(path: string, name: string) {
  const normalizedValue = `${path}-${name}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedValue || 'entry'
}

function parseSizeLabel(sizeLabel: string) {
  const normalizedValue = sizeLabel.trim().toUpperCase()
  const match = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/)

  if (!match) {
    return null
  }

  const numericValue = Number.parseFloat(match[1])

  if (!Number.isFinite(numericValue)) {
    return null
  }

  const unit = match[2]
  const unitMultiplier = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }[unit]

  if (!unitMultiplier) {
    return null
  }

  return Math.round(numericValue * unitMultiplier)
}

function formatSelectedSize(totalBytes: number) {
  if (totalBytes <= 0) {
    return '0 B'
  }

  if (totalBytes < 1024) {
    return `${totalBytes} B`
  }

  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`
  }

  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
}

function createEntry(entry: CommanderSeedEntry, directoryPath: string): CommanderDirectoryEntry {
  return {
    id: entry.id ?? toSeedEntryId(directoryPath, entry.name),
    name: entry.name,
    ext: entry.ext,
    kind: entry.kind,
    sizeLabel: entry.sizeLabel,
    sizeBytes: parseSizeLabel(entry.sizeLabel),
    modified: entry.modified,
    hidden: Boolean(entry.hidden),
    gitStatus: entry.gitStatus,
    executable: entry.executable,
    symlinkTarget: entry.symlinkTarget,
  }
}

function sortEntries(entries: CommanderDirectoryEntry[], sortMode: CommanderSortMode) {
  const sortedEntries = [...entries]

  sortedEntries.sort((leftEntry, rightEntry) => {
    if (leftEntry.kind === 'folder' && rightEntry.kind !== 'folder') {
      return -1
    }

    if (leftEntry.kind !== 'folder' && rightEntry.kind === 'folder') {
      return 1
    }

    if (sortMode === 'ext') {
      const extCompare = (leftEntry.ext || leftEntry.name).localeCompare(rightEntry.ext || rightEntry.name)

      if (extCompare !== 0) {
        return extCompare
      }
    }

    if (sortMode === 'modified') {
      const modifiedCompare = rightEntry.modified.localeCompare(leftEntry.modified)

      if (modifiedCompare !== 0) {
        return modifiedCompare
      }
    }

    return leftEntry.name.localeCompare(rightEntry.name)
  })

  return sortedEntries
}

function getParentPath(path: string) {
  if (path === '~') {
    return null
  }

  const pathParts = path.split('/')

  if (pathParts.length <= 1) {
    return null
  }

  return pathParts.slice(0, -1).join('/') || '~'
}

function getBaseName(path: string) {
  const pathParts = path.split('/')

  return pathParts[pathParts.length - 1] ?? path
}

function joinPath(parentPath: string, segment: string) {
  if (parentPath === '~') {
    return `~/${segment}`
  }

  return `${parentPath}/${segment}`
}

function splitEntryName(entry: CommanderSeedEntry) {
  return entry.name
}

function splitEntryBaseNameAndExt(entry: CommanderDirectoryEntry) {
  if (entry.kind !== 'file' || !entry.ext) {
    return {
      baseName: entry.name,
      ext: '',
    }
  }

  const expectedSuffix = `.${entry.ext}`

  if (entry.name.toLocaleLowerCase().endsWith(expectedSuffix.toLocaleLowerCase())) {
    return {
      baseName: entry.name.slice(0, -expectedSuffix.length),
      ext: entry.ext,
    }
  }

  return {
    baseName: entry.name,
    ext: entry.ext,
  }
}

function normalizeEntryName(name: string) {
  return name.trim().toLowerCase()
}

function formatRenameCounter(counter: number, width?: number) {
  const counterValue = String(counter)

  if (!width || width <= counterValue.length) {
    return counterValue
  }

  return counterValue.padStart(width, '0')
}

function applyRenameTextTransform(value: string, modifier?: string) {
  switch (modifier?.toLowerCase()) {
    case 'l':
      return value.toLocaleLowerCase()
    case 'u':
      return value.toLocaleUpperCase()
    default:
      return value
  }
}

function applyCommanderRenameTemplate(
  entry: CommanderDirectoryEntry,
  template: string,
  index: number,
) {
  const normalizedTemplate = template.trim()

  if (!normalizedTemplate) {
    return ''
  }

  const { baseName, ext } = splitEntryBaseNameAndExt(entry)
  const usesFullNameToken = /\[F(?::[a-z])?\]/i.test(normalizedTemplate)
  const usesExtensionToken = /\[E(?::[a-z])?\]/i.test(normalizedTemplate)
  let nextName = normalizedTemplate
    .replace(/\[C(?::(\d+))?(?::(\d+))?(?::(\d+))?\]/gi, (_match, firstValue: string | undefined, secondValue: string | undefined, thirdValue: string | undefined) => {
      const first = firstValue ? Number.parseInt(firstValue, 10) : undefined
      const second = secondValue ? Number.parseInt(secondValue, 10) : undefined
      const third = thirdValue ? Number.parseInt(thirdValue, 10) : undefined

      const start = Number.isFinite(second) ? (first ?? 1) : 1
      const width = Number.isFinite(second) ? second : first
      const step = Number.isFinite(third) ? (third ?? 1) : 1
      const counter = start + (index * step)

      return formatRenameCounter(counter, Number.isFinite(width) ? width : undefined)
    })
    .replace(/\[(N|E|F)(?::([a-z]))?\]/gi, (_match, token: 'N' | 'E' | 'F', modifier: string | undefined) => {
      const rawValue = token === 'N'
        ? baseName
        : token === 'E'
          ? ext
          : entry.name

      return applyRenameTextTransform(rawValue, modifier)
    })
    .trim()

  if (!nextName) {
    return ''
  }

  if (entry.kind === 'file' && ext && !usesFullNameToken && !usesExtensionToken && !nextName.includes('.')) {
    nextName = `${nextName}.${ext}`
  }

  return nextName
}

function ensureDirectory(client: CommanderClientState, path: string) {
  const existingEntries = client.directories.get(path)

  if (existingEntries) {
    return existingEntries
  }

  const nextEntries: CommanderSeedEntry[] = []
  client.directories.set(path, nextEntries)
  return nextEntries
}

function getUniqueEntryName(
  client: CommanderClientState,
  directoryPath: string,
  baseName: string,
) {
  const existingNames = new Set((client.directories.get(directoryPath) ?? []).map((entry) => normalizeEntryName(entry.name)))

  if (!existingNames.has(normalizeEntryName(baseName))) {
    return baseName
  }

  let index = 1

  while (true) {
    const nextName = `${baseName}-copy${index === 1 ? '' : `-${index}`}`

    if (!existingNames.has(normalizeEntryName(nextName))) {
      return nextName
    }

    index += 1
  }
}

function getUniqueDirectoryName(
  client: CommanderClientState,
  directoryPath: string,
  baseName: string,
) {
  const existingNames = new Set((client.directories.get(directoryPath) ?? []).map((entry) => normalizeEntryName(entry.name)))

  if (!existingNames.has(normalizeEntryName(baseName))) {
    return baseName
  }

  let index = 2

  while (true) {
    const nextName = `${baseName} ${index}`

    if (!existingNames.has(normalizeEntryName(nextName))) {
      return nextName
    }

    index += 1
  }
}

function formatItemCountLabel(itemCount: number) {
  return `${itemCount} item${itemCount === 1 ? '' : 's'}`
}

function cloneSeedEntryForDirectory(entry: CommanderSeedEntry, directoryPath: string, name = entry.name): CommanderSeedEntry {
  return {
    ...structuredClone(entry),
    id: toSeedEntryId(directoryPath, name),
    name,
  }
}

function syncDirectoryMetadata(client: CommanderClientState, path: string) {
  const parentPath = getParentPath(path)

  if (!parentPath) {
    return
  }

  const parentEntries = client.directories.get(parentPath)

  if (!parentEntries) {
    return
  }

  const targetName = getBaseName(path)
  const nextEntries = parentEntries.map((entry) => {
    if (entry.kind !== 'folder' || entry.name !== targetName) {
      return entry
    }

    return {
      ...entry,
      sizeLabel: formatItemCountLabel((client.directories.get(path) ?? []).length),
    }
  })

  client.directories.set(parentPath, nextEntries)
}

function cloneDirectorySubtree(
  client: CommanderClientState,
  sourcePath: string,
  targetPath: string,
) {
  const sourceSubtreePaths = Array.from(client.directories.keys())
    .filter((candidatePath) => candidatePath === sourcePath || candidatePath.startsWith(`${sourcePath}/`))
    .sort((leftPath, rightPath) => leftPath.length - rightPath.length)

  sourceSubtreePaths.forEach((currentSourcePath) => {
    const relativePath = currentSourcePath === sourcePath
      ? ''
      : currentSourcePath.slice(sourcePath.length + 1)
    const currentTargetPath = relativePath ? `${targetPath}/${relativePath}` : targetPath
    const sourceEntries = client.directories.get(currentSourcePath) ?? []
    const clonedEntries = sourceEntries.map((entry) => cloneSeedEntryForDirectory(entry, currentTargetPath))

    client.directories.set(currentTargetPath, clonedEntries)
  })
}

function removeDirectorySubtree(
  client: CommanderClientState,
  path: string,
) {
  Array.from(client.directories.keys())
    .filter((candidatePath) => candidatePath === path || candidatePath.startsWith(`${path}/`))
    .forEach((candidatePath) => {
      client.directories.delete(candidatePath)
    })
}

function mutateEntryList(
  client: CommanderClientState,
  path: string,
  updater: (entries: CommanderSeedEntry[]) => CommanderSeedEntry[],
) {
  const currentEntries = ensureDirectory(client, path)
  const nextEntries = updater([...currentEntries])

  client.directories.set(path, nextEntries)
  syncDirectoryMetadata(client, path)
}

function removeEntryFromDirectory(
  client: CommanderClientState,
  path: string,
  entry: CommanderSeedEntry,
) {
  if (entry.kind === 'folder') {
    removeDirectorySubtree(client, joinPath(path, entry.name))
  }

  mutateEntryList(client, path, (entries) => (
    entries.filter((candidateEntry) => normalizeEntryName(candidateEntry.name) !== normalizeEntryName(entry.name))
  ))
}

function removeEntryByName(
  client: CommanderClientState,
  path: string,
  name: string,
) {
  const directoryEntries = client.directories.get(path) ?? []
  const matchingEntry = directoryEntries.find((entry) => normalizeEntryName(entry.name) === normalizeEntryName(name))

  if (!matchingEntry) {
    return false
  }

  removeEntryFromDirectory(client, path, matchingEntry)
  return true
}

function copyEntryIntoDirectory(
  client: CommanderClientState,
  sourcePath: string,
  targetPath: string,
  entry: CommanderSeedEntry,
  options?: {
    overwrite?: boolean
  },
) {
  const overwrite = Boolean(options?.overwrite)
  const nextName = overwrite ? splitEntryName(entry) : getUniqueEntryName(client, targetPath, splitEntryName(entry))

  if (overwrite) {
    removeEntryByName(client, targetPath, nextName)
  }

  const copiedEntry = cloneSeedEntryForDirectory(entry, targetPath, nextName)

  mutateEntryList(client, targetPath, (entries) => [...entries, copiedEntry])

  if (entry.kind === 'folder') {
    const sourceDirectoryPath = joinPath(sourcePath, entry.name)
    const targetDirectoryPath = joinPath(targetPath, copiedEntry.name)

    cloneDirectorySubtree(client, sourceDirectoryPath, targetDirectoryPath)
    syncDirectoryMetadata(client, targetDirectoryPath)
  }

  return copiedEntry
}

function buildSeedDirectories() {
  const explicitDirectories = new Map<string, CommanderSeedEntry[]>([
    [
      INITIAL_LEFT_PATH,
      commanderWidgetMockState.leftPane.rows.map((row) => ({
        id: row.id,
        name: row.name,
        ext: row.ext,
        kind: row.kind,
        sizeLabel: row.size,
        modified: row.modified,
        hidden: row.hidden,
        gitStatus: row.gitStatus,
        executable: row.executable,
        symlinkTarget: row.symlinkTarget,
      })),
    ],
    [
      INITIAL_RIGHT_PATH,
      commanderWidgetMockState.rightPane.rows.map((row) => ({
        id: row.id,
        name: row.name,
        ext: row.ext,
        kind: row.kind,
        sizeLabel: row.size,
        modified: row.modified,
        hidden: row.hidden,
        gitStatus: row.gitStatus,
        executable: row.executable,
        symlinkTarget: row.symlinkTarget,
      })),
    ],
    [
      '~/projects/runa-terminal/frontend/src/widgets',
      [
        { name: 'commander-widget', ext: 'tsx', kind: 'file', sizeLabel: '8.4 KB', modified: '2026-04-20 09:14', gitStatus: 'M' },
        { name: 'commander-widget.styles', ext: 'ts', kind: 'file', sizeLabel: '6.1 KB', modified: '2026-04-20 08:58', gitStatus: 'M' },
        { name: 'terminal-widget', ext: 'tsx', kind: 'file', sizeLabel: '4.1 KB', modified: '2026-04-19 17:49', gitStatus: 'M' },
        { name: 'terminal-panel', ext: 'ts', kind: 'file', sizeLabel: '2.6 KB', modified: '2026-04-19 22:12' },
        { name: 'right-action-rail-widget', ext: 'tsx', kind: 'file', sizeLabel: '7.3 KB', modified: '2026-04-20 08:05', gitStatus: 'M' },
        { name: 'shell-topbar-widget', ext: 'tsx', kind: 'file', sizeLabel: '5.7 KB', modified: '2026-04-20 08:11', gitStatus: 'M' },
        { name: 'widget-busy-overlay-widget', ext: 'tsx', kind: 'file', sizeLabel: '10.9 KB', modified: '2026-04-20 07:50', gitStatus: 'M' },
        { name: 'index', ext: 'ts', kind: 'file', sizeLabel: '1.0 KB', modified: '2026-04-20 07:44' },
      ],
    ],
    [
      '~/projects/runa-terminal/frontend/src/shared',
      [
        { name: 'model', ext: '', kind: 'folder', sizeLabel: '4 items', modified: '2026-04-20 08:00' },
        { name: 'ui', ext: '', kind: 'folder', sizeLabel: '3 items', modified: '2026-04-20 08:00' },
      ],
    ],
    [
      '~/projects/runa-terminal/frontend/src/shared/model',
      [
        { name: 'app', ext: 'ts', kind: 'file', sizeLabel: '242 B', modified: '2026-04-19 11:20' },
        { name: 'widget-focus', ext: 'ts', kind: 'file', sizeLabel: '312 B', modified: '2026-04-20 06:41' },
        { name: 'ai-blocked-widgets', ext: 'ts', kind: 'file', sizeLabel: '398 B', modified: '2026-04-19 21:18' },
        { name: 'modal', ext: 'ts', kind: 'file', sizeLabel: '1.1 KB', modified: '2026-04-19 22:47' },
      ],
    ],
    [
      '~/projects/runa-terminal/frontend/src/shared/ui',
      [
        { name: 'components', ext: '', kind: 'folder', sizeLabel: '12 items', modified: '2026-04-20 08:00' },
        { name: 'primitives', ext: '', kind: 'folder', sizeLabel: '13 items', modified: '2026-04-19 18:34' },
        { name: 'tokens', ext: '', kind: 'folder', sizeLabel: '2 items', modified: '2026-04-20 07:22' },
      ],
    ],
    [
      '~/projects/runa-terminal/frontend/src/shared/ui/components',
      [
        { name: 'dockview-tab-chrome', ext: 'tsx', kind: 'file', sizeLabel: '2.8 KB', modified: '2026-04-20 08:19', gitStatus: 'A' },
        { name: 'dockview-tab-pill', ext: 'tsx', kind: 'file', sizeLabel: '1.4 KB', modified: '2026-04-20 08:26', gitStatus: 'A' },
        { name: 'icon-button', ext: 'tsx', kind: 'file', sizeLabel: '1.2 KB', modified: '2026-04-19 20:41' },
        { name: 'terminal-status-header', ext: 'tsx', kind: 'file', sizeLabel: '5.0 KB', modified: '2026-04-20 08:25', gitStatus: 'M' },
        { name: 'avatar', ext: 'tsx', kind: 'file', sizeLabel: '868 B', modified: '2026-04-19 21:06' },
      ],
    ],
    [
      '~/projects/runa-terminal/docs/architecture',
      [
        { name: 'system', ext: 'md', kind: 'file', sizeLabel: '7.1 KB', modified: '2026-04-18 19:06' },
        { name: 'frontend', ext: 'md', kind: 'file', sizeLabel: '6.0 KB', modified: '2026-04-18 18:44' },
        { name: 'runtime', ext: 'md', kind: 'file', sizeLabel: '5.2 KB', modified: '2026-04-18 18:31' },
        { name: 'adr', ext: '', kind: 'folder', sizeLabel: '4 items', modified: '2026-04-17 20:14' },
      ],
    ],
    [
      '~/projects/runa-terminal/docs/validation',
      [
        { name: 'workspace', ext: 'md', kind: 'file', sizeLabel: '15.8 KB', modified: '2026-04-20 08:32', gitStatus: 'M' },
        { name: 'ui', ext: 'md', kind: 'file', sizeLabel: '9.4 KB', modified: '2026-04-18 21:54' },
        { name: 'execution', ext: 'md', kind: 'file', sizeLabel: '4.8 KB', modified: '2026-04-18 21:33' },
        { name: 'remote', ext: 'md', kind: 'file', sizeLabel: '3.9 KB', modified: '2026-04-18 20:58' },
      ],
    ],
    [
      '~/projects/runa-terminal/docs/.cache',
      [
        { name: 'validation-smoke', ext: 'json', kind: 'file', sizeLabel: '1.1 KB', modified: '2026-04-17 11:06', hidden: true },
        { name: 'workspace-snapshot', ext: 'png', kind: 'file', sizeLabel: '218 KB', modified: '2026-04-17 11:05', hidden: true },
        { name: 'shell-layout', ext: 'json', kind: 'file', sizeLabel: '842 B', modified: '2026-04-17 11:04', hidden: true },
      ],
    ],
  ])

  const allDirectoryPaths = new Set<string>(explicitDirectories.keys())

  Array.from(explicitDirectories.keys()).forEach((path) => {
    let currentParentPath = getParentPath(path)

    while (currentParentPath) {
      allDirectoryPaths.add(currentParentPath)
      currentParentPath = getParentPath(currentParentPath)
    }
  })

  const sortedDirectoryPaths = Array.from(allDirectoryPaths).sort((leftPath, rightPath) => leftPath.localeCompare(rightPath))

  sortedDirectoryPaths.forEach((path) => {
    if (explicitDirectories.has(path)) {
      return
    }

    const childPaths = sortedDirectoryPaths
      .filter((candidatePath) => getParentPath(candidatePath) === path)
      .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath))

    const directoryEntries = childPaths.map((childPath) => ({
      id: toSeedEntryId(path, getBaseName(childPath)),
      name: getBaseName(childPath),
      ext: '',
      kind: 'folder' as const,
      sizeLabel: formatItemCountLabel(explicitDirectories.get(childPath)?.length ?? 0),
      modified: '2026-04-20 08:00',
      hidden: getBaseName(childPath).startsWith('.'),
    }))

    explicitDirectories.set(path, directoryEntries)
  })

  return explicitDirectories
}

const baseSeedDirectories = buildSeedDirectories()

function cloneSeedDirectories() {
  return new Map<string, CommanderSeedEntry[]>(
    Array.from(baseSeedDirectories.entries()).map(([path, entries]) => [path, structuredClone(entries)]),
  )
}

function getClient(widgetId: string) {
  const existingClient = clients.get(widgetId)

  if (existingClient) {
    return existingClient
  }

  const nextClient = {
    directories: cloneSeedDirectories(),
  }

  clients.set(widgetId, nextClient)

  return nextClient
}

function readDirectoryEntries(
  widgetId: string,
  path: string,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
  },
) {
  const client = getClient(widgetId)
  const directoryEntries = client.directories.get(path) ?? []
  const preparedEntries = directoryEntries
    .map((entry) => createEntry(entry, path))
    .filter((entry) => options.showHidden || !entry.hidden)

  return sortEntries(preparedEntries, options.sortMode)
}

function resolveEntry(widgetId: string, path: string, entryId: string) {
  const client = getClient(widgetId)
  const directoryEntries = client.directories.get(path) ?? []
  const entry = directoryEntries.find((candidateEntry) => {
    const resolvedEntry = createEntry(candidateEntry, path)

    return resolvedEntry.id === entryId
  })

  if (!entry) {
    return null
  }

  return createEntry(entry, path)
}

function resolveEntriesInOrder(
  widgetId: string,
  path: string,
  entryIds: string[],
) {
  return entryIds
    .map((entryId) => resolveEntry(widgetId, path, entryId))
    .filter((entry): entry is CommanderDirectoryEntry => Boolean(entry))
}

function createInitialPaneState(
  widgetId: string,
  paneId: CommanderPaneId,
  path: string,
  selectedIds: string[],
  cursorEntryId: string | null,
  selectionAnchorEntryId: string | null,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
  },
  history?: {
    back: string[]
    forward: string[]
  },
  entriesOverride?: CommanderDirectoryEntry[],
): CommanderPaneRuntimeState {
  const entries = entriesOverride ?? readDirectoryEntries(widgetId, path, options)
  const visibleIds = new Set(entries.map((entry) => entry.id))
  const nextSelectedIds = selectedIds.filter((entryId) => visibleIds.has(entryId))
  const nextCursorEntryId = cursorEntryId && visibleIds.has(cursorEntryId)
    ? cursorEntryId
    : (entries[0]?.id ?? null)
  const nextSelectionAnchorEntryId = selectionAnchorEntryId && visibleIds.has(selectionAnchorEntryId)
    ? selectionAnchorEntryId
    : nextCursorEntryId

  return {
    id: paneId,
    path,
    entries,
    cursorEntryId: nextCursorEntryId,
    selectionAnchorEntryId: nextSelectionAnchorEntryId,
    selectedIds: nextSelectedIds,
    historyBack: history?.back ?? [],
    historyForward: history?.forward ?? [],
  }
}

function createPaneStateFromPersisted(
  widgetId: string,
  paneId: CommanderPaneId,
  paneState: CommanderPanePersistedState,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
  },
) {
  return createInitialPaneState(
    widgetId,
    paneId,
    paneState.path,
    paneState.selectedIds,
    paneState.cursorEntryId,
    paneState.selectionAnchorEntryId,
    options,
    {
      back: paneState.historyBack,
      forward: paneState.historyForward,
    },
    paneState.entries,
  )
}

export function createCommanderWidgetRuntimeState(
  widgetId: string,
  persistedState?: CommanderWidgetPersistedState | null,
): CommanderWidgetRuntimeState {
  const showHidden = persistedState?.showHidden ?? commanderWidgetMockState.showHidden
  const sortMode = persistedState?.sortMode ?? commanderWidgetMockState.sortMode
  const options = { showHidden, sortMode }

  return {
    widgetId,
    mode: 'commander',
    viewMode: persistedState?.viewMode ?? commanderWidgetMockState.viewMode,
    activePane: persistedState?.activePane ?? commanderWidgetMockState.activePane,
    showHidden,
    sortMode,
    footerHints: commanderWidgetMockState.footerHints,
    pendingOperation: null,
    leftPane: persistedState?.leftPane
      ? createPaneStateFromPersisted(widgetId, 'left', persistedState.leftPane, options)
      : createInitialPaneState(
        widgetId,
        'left',
        commanderWidgetMockState.leftPane.path,
        commanderWidgetMockState.leftPane.rows.filter((row) => row.selected).map((row) => row.id),
        commanderWidgetMockState.leftPane.rows.find((row) => row.focused)?.id ?? null,
        commanderWidgetMockState.leftPane.rows.find((row) => row.focused)?.id ?? null,
        options,
      ),
    rightPane: persistedState?.rightPane
      ? createPaneStateFromPersisted(widgetId, 'right', persistedState.rightPane, options)
      : createInitialPaneState(
        widgetId,
        'right',
        commanderWidgetMockState.rightPane.path,
        commanderWidgetMockState.rightPane.rows.filter((row) => row.selected).map((row) => row.id),
        commanderWidgetMockState.rightPane.rows.find((row) => row.focused)?.id ?? null,
        commanderWidgetMockState.rightPane.rows.find((row) => row.focused)?.id ?? null,
        options,
      ),
  }
}

function cloneClientDirectories(snapshot: CommanderClientSnapshot | null | undefined) {
  if (!snapshot) {
    return cloneSeedDirectories()
  }

  const directoryEntries = Object.entries(snapshot.directories)
    .filter(([path, entries]) => typeof path === 'string' && Array.isArray(entries))
    .map(([path, entries]) => [path, structuredClone(entries)] as const)

  if (directoryEntries.length === 0) {
    return cloneSeedDirectories()
  }

  return new Map<string, CommanderSeedEntry[]>(directoryEntries)
}

export function hydrateCommanderClient(
  widgetId: string,
  snapshot: CommanderClientSnapshot | null | undefined,
) {
  clients.set(widgetId, {
    directories: cloneClientDirectories(snapshot),
  })
}

export function getCommanderClientSnapshot(widgetId: string): CommanderClientSnapshot {
  const client = getClient(widgetId)

  return {
    directories: Object.fromEntries(
      Array.from(client.directories.entries()).map(([path, entries]) => [path, structuredClone(entries)]),
    ),
  }
}

export function readCommanderDirectory(
  widgetId: string,
  path: string,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
  },
): CommanderDirectorySnapshot {
  return {
    path,
    entries: readDirectoryEntries(widgetId, path, options),
  }
}

export function openCommanderEntry(
  widgetId: string,
  path: string,
  entryId: string,
): CommanderNavigationResult | null {
  const entry = resolveEntry(widgetId, path, entryId)

  if (!entry) {
    return null
  }

  if (entry.kind === 'folder') {
    return {
      kind: 'directory',
      path: joinPath(path, entry.name),
    }
  }

  if (entry.kind === 'symlink') {
    return {
      kind: 'symlink',
      entry,
    }
  }

  return {
    kind: 'file',
    entry,
  }
}

export function getCommanderParentPath(path: string) {
  return getParentPath(path)
}

export function resolveCommanderExistingPath(widgetId: string, path: string) {
  const client = getClient(widgetId)
  let currentPath = path

  while (!client.directories.has(currentPath)) {
    const parentPath = getParentPath(currentPath)

    if (!parentPath) {
      return '~'
    }

    currentPath = parentPath
  }

  return currentPath
}

export function getCommanderSelectedSize(entries: CommanderDirectoryEntry[], selectedIds: string[]) {
  const totalBytes = entries
    .filter((entry) => selectedIds.includes(entry.id))
    .reduce((currentTotal, entry) => currentTotal + (entry.sizeBytes ?? 0), 0)

  return formatSelectedSize(totalBytes)
}

export function copyCommanderEntries({
  widgetId,
  path,
  entryIds,
  targetPath,
  overwrite,
}: CommanderMutationParams & {
  targetPath: string
  overwrite?: boolean
}) {
  const client = getClient(widgetId)
  const sourceEntries = client.directories.get(path) ?? []
  const shouldOverwrite = Boolean(overwrite)

  entryIds.forEach((entryId) => {
    const entry = sourceEntries.find((candidateEntry) => createEntry(candidateEntry, path).id === entryId)

    if (!entry) {
      return
    }

    copyEntryIntoDirectory(client, path, targetPath, entry, {
      overwrite: shouldOverwrite,
    })
  })
}

export function moveCommanderEntries({
  widgetId,
  path,
  entryIds,
  targetPath,
  overwrite,
}: CommanderMutationParams & {
  targetPath: string
  overwrite?: boolean
}) {
  if (path === targetPath) {
    return
  }

  const client = getClient(widgetId)
  const sourceEntries = client.directories.get(path) ?? []
  const movedEntryIds = new Set(entryIds)
  const shouldOverwrite = Boolean(overwrite)

  sourceEntries
    .filter((entry) => movedEntryIds.has(createEntry(entry, path).id))
    .forEach((entry) => {
      if (entry.kind === 'folder') {
        const sourceDirectoryPath = joinPath(path, entry.name)

        if (targetPath === sourceDirectoryPath || targetPath.startsWith(`${sourceDirectoryPath}/`)) {
          return
        }
      }

      copyEntryIntoDirectory(client, path, targetPath, entry, {
        overwrite: shouldOverwrite,
      })
      removeEntryFromDirectory(client, path, entry)
    })
}

export function deleteCommanderEntries({
  widgetId,
  path,
  entryIds,
}: CommanderMutationParams) {
  const client = getClient(widgetId)
  const sourceEntries = client.directories.get(path) ?? []
  const deletedEntryIds = new Set(entryIds)

  sourceEntries
    .filter((entry) => deletedEntryIds.has(createEntry(entry, path).id))
    .forEach((entry) => {
      if (entry.kind === 'folder') {
        removeDirectorySubtree(client, joinPath(path, entry.name))
      }
    })

  mutateEntryList(client, path, (entries) => (
    entries.filter((entry) => !deletedEntryIds.has(createEntry(entry, path).id))
  ))
}

export function mkdirCommanderDirectory(widgetId: string, path: string) {
  const client = getClient(widgetId)
  const nextName = getUniqueDirectoryName(client, path, 'New folder')
  const nextPath = joinPath(path, nextName)
  const nextEntry = cloneSeedEntryForDirectory(
    {
      name: nextName,
      ext: '',
      kind: 'folder',
      sizeLabel: '0 items',
      modified: '2026-04-20 12:00',
    },
    path,
    nextName,
  )

  ensureDirectory(client, nextPath)
  mutateEntryList(client, path, (entries) => [...entries, nextEntry])
  syncDirectoryMetadata(client, nextPath)

  return {
    entryId: nextEntry.id ?? toSeedEntryId(path, nextName),
    path: nextPath,
  }
}

export function getCommanderConflictingEntryNames({
  widgetId,
  path,
  entryIds,
  targetPath,
}: CommanderMutationParams & {
  targetPath: string
}) {
  if (path === targetPath) {
    return []
  }

  const client = getClient(widgetId)
  const sourceEntries = client.directories.get(path) ?? []
  const targetEntries = client.directories.get(targetPath) ?? []
  const targetNames = new Set(targetEntries.map((entry) => normalizeEntryName(entry.name)))

  return sourceEntries
    .filter((entry) => entryIds.includes(createEntry(entry, path).id))
    .map((entry) => entry.name)
    .filter((entryName) => targetNames.has(normalizeEntryName(entryName)))
}

export function getCommanderEntryNameConflict({
  widgetId,
  path,
  name,
  ignoreEntryId,
}: CommanderEntryNameConflictParams) {
  const client = getClient(widgetId)
  const directoryEntries = client.directories.get(path) ?? []
  const normalizedName = normalizeEntryName(name)

  return directoryEntries.some((entry) => {
    const resolvedEntryId = createEntry(entry, path).id

    if (ignoreEntryId && resolvedEntryId === ignoreEntryId) {
      return false
    }

    return normalizeEntryName(entry.name) === normalizedName
  })
}

export function previewCommanderRenameEntries({
  widgetId,
  path,
  entryIds,
  template,
}: {
  widgetId: string
  path: string
  entryIds: string[]
  template: string
}) {
  const client = getClient(widgetId)
  const renameEntries = resolveEntriesInOrder(widgetId, path, entryIds)
  const renameEntryIdSet = new Set(renameEntries.map((entry) => entry.id))
  const existingDirectoryEntries = client.directories.get(path) ?? []
  const generatedNameCounts = new Map<string, number>()
  const preview: CommanderRenamePreviewItem[] = renameEntries.map((entry, index) => {
    const nextName = applyCommanderRenameTemplate(entry, template, index)
    const normalizedNextName = normalizeEntryName(nextName)

    if (normalizedNextName) {
      generatedNameCounts.set(normalizedNextName, (generatedNameCounts.get(normalizedNextName) ?? 0) + 1)
    }

    return {
      entryId: entry.id,
      currentName: entry.name,
      nextName,
      status: 'ok',
      conflict: false,
    }
  })

  const duplicateTargetNames: string[] = []
  const conflictEntryNames: string[] = []

  preview.forEach((item) => {
    const normalizedNextName = normalizeEntryName(item.nextName)

    if (!normalizedNextName) {
      item.status = 'invalid'
      item.conflict = true
      duplicateTargetNames.push(item.currentName)
      return
    }

    const hasDuplicateTarget = (generatedNameCounts.get(normalizedNextName) ?? 0) > 1
    const hasDirectoryConflict = existingDirectoryEntries.some((entry) => {
      const resolvedEntryId = createEntry(entry, path).id

      if (renameEntryIdSet.has(resolvedEntryId)) {
        return false
      }

      return normalizeEntryName(entry.name) === normalizedNextName
    })

    item.conflict = hasDuplicateTarget || hasDirectoryConflict
    item.status = hasDuplicateTarget
      ? 'duplicate'
      : hasDirectoryConflict
        ? 'conflict'
        : 'ok'

    if (hasDuplicateTarget) {
      duplicateTargetNames.push(item.nextName)
    } else if (hasDirectoryConflict) {
      conflictEntryNames.push(item.nextName)
    }
  })

  return {
    preview,
    conflictEntryNames: Array.from(new Set(conflictEntryNames)),
    duplicateTargetNames: Array.from(new Set(duplicateTargetNames)),
  }
}

export function renameCommanderEntry({
  widgetId,
  path,
  entryId,
  nextName,
  overwrite,
}: {
  widgetId: string
  path: string
  entryId: string
  nextName: string
  overwrite?: boolean
}) {
  const trimmedNextName = nextName.trim()

  if (!trimmedNextName) {
    return null
  }

  const client = getClient(widgetId)
  const directoryEntries = client.directories.get(path) ?? []
  const currentEntry = directoryEntries.find((entry) => createEntry(entry, path).id === entryId)

  if (!currentEntry) {
    return null
  }

  if (currentEntry.name === trimmedNextName) {
    return {
      entryId,
    }
  }

  if (overwrite) {
    removeEntryByName(client, path, trimmedNextName)
  }

  mutateEntryList(client, path, (entries) => (
    entries.map((entry) => {
      if (createEntry(entry, path).id !== entryId) {
        return entry
      }

      return {
        ...entry,
        id: toSeedEntryId(path, trimmedNextName),
        name: trimmedNextName,
      }
    })
  ))

  if (currentEntry.kind === 'folder') {
    const previousPath = joinPath(path, currentEntry.name)
    const nextPath = joinPath(path, trimmedNextName)
    const subtreeEntries = Array.from(client.directories.entries())
      .filter(([candidatePath]) => candidatePath === previousPath || candidatePath.startsWith(`${previousPath}/`))
      .sort(([leftPath], [rightPath]) => leftPath.length - rightPath.length)

    subtreeEntries.forEach(([candidatePath, entries]) => {
      const relativePath = candidatePath === previousPath ? '' : candidatePath.slice(previousPath.length + 1)
      const rewrittenPath = relativePath ? `${nextPath}/${relativePath}` : nextPath
      const rewrittenEntries = entries.map((entry) => cloneSeedEntryForDirectory(entry, rewrittenPath))

      client.directories.set(rewrittenPath, rewrittenEntries)
    })

    removeDirectorySubtree(client, previousPath)
    syncDirectoryMetadata(client, nextPath)
  }

  return {
    entryId: toSeedEntryId(path, trimmedNextName),
  }
}

export function renameCommanderEntries({
  widgetId,
  path,
  entryIds,
  template,
  overwrite,
}: {
  widgetId: string
  path: string
  entryIds: string[]
  template: string
  overwrite?: boolean
}) {
  const renamePreview = previewCommanderRenameEntries({
    widgetId,
    path,
    entryIds,
    template,
  })

  if (renamePreview.duplicateTargetNames.length > 0) {
    return null
  }

  const shouldOverwrite = Boolean(overwrite)

  if (!shouldOverwrite && renamePreview.conflictEntryNames.length > 0) {
    return null
  }

  const renameEntries = resolveEntriesInOrder(widgetId, path, entryIds)

  if (renameEntries.length === 0) {
    return null
  }

  const client = getClient(widgetId)
  const temporaryNamePrefix = `.runa-rename-${Date.now()}`

  renameEntries.forEach((entry, index) => {
    renameCommanderEntry({
      widgetId,
      path,
      entryId: entry.id,
      nextName: `${temporaryNamePrefix}-${index + 1}`,
    })
  })

  if (shouldOverwrite) {
    renamePreview.conflictEntryNames.forEach((conflictEntryName) => {
      removeEntryByName(client, path, conflictEntryName)
    })
  }

  const nextEntryIds = renamePreview.preview
    .map((item, index) => renameCommanderEntry({
      widgetId,
      path,
      entryId: toSeedEntryId(path, `${temporaryNamePrefix}-${index + 1}`),
      nextName: item.nextName,
    })?.entryId ?? null)
    .filter((entryId): entryId is string => Boolean(entryId))

  return {
    entryIds: nextEntryIds,
  }
}
