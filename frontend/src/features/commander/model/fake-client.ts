import { commanderWidgetMockState } from '../../../widgets/commander-widget.mock'
import type {
  CommanderDirectoryEntry,
  CommanderDirectorySnapshot,
  CommanderNavigationResult,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderSortMode,
  CommanderWidgetRuntimeState,
  CommanderRowKind,
} from './types'

type CommanderSeedEntry = {
  id?: string
  name: string
  ext: string
  kind: CommanderRowKind
  sizeLabel: string
  modified: string
  hidden?: boolean
  gitStatus?: string
  executable?: boolean
  symlinkTarget?: string
}

type CommanderClientState = {
  directories: Map<string, CommanderSeedEntry[]>
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

function formatItemCountLabel(itemCount: number) {
  return `${itemCount} item${itemCount === 1 ? '' : 's'}`
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

function createInitialPaneState(
  widgetId: string,
  paneId: CommanderPaneId,
  path: string,
  selectedIds: string[],
  cursorEntryId: string | null,
  options: {
    showHidden: boolean
    sortMode: CommanderSortMode
  },
): CommanderPaneRuntimeState {
  const entries = readDirectoryEntries(widgetId, path, options)
  const visibleIds = new Set(entries.map((entry) => entry.id))
  const nextSelectedIds = selectedIds.filter((entryId) => visibleIds.has(entryId))
  const nextCursorEntryId = cursorEntryId && visibleIds.has(cursorEntryId)
    ? cursorEntryId
    : (entries[0]?.id ?? null)

  return {
    id: paneId,
    path,
    entries,
    cursorEntryId: nextCursorEntryId,
    selectedIds: nextSelectedIds,
    historyBack: [],
    historyForward: [],
  }
}

export function createCommanderWidgetRuntimeState(widgetId: string): CommanderWidgetRuntimeState {
  const showHidden = commanderWidgetMockState.showHidden
  const sortMode = commanderWidgetMockState.sortMode
  const options = { showHidden, sortMode }

  return {
    widgetId,
    mode: 'commander',
    viewMode: commanderWidgetMockState.viewMode,
    activePane: commanderWidgetMockState.activePane,
    showHidden,
    sortMode,
    footerHints: commanderWidgetMockState.footerHints,
    leftPane: createInitialPaneState(
      widgetId,
      'left',
      commanderWidgetMockState.leftPane.path,
      commanderWidgetMockState.leftPane.rows.filter((row) => row.selected).map((row) => row.id),
      commanderWidgetMockState.leftPane.rows.find((row) => row.focused)?.id ?? null,
      options,
    ),
    rightPane: createInitialPaneState(
      widgetId,
      'right',
      commanderWidgetMockState.rightPane.path,
      commanderWidgetMockState.rightPane.rows.filter((row) => row.selected).map((row) => row.id),
      commanderWidgetMockState.rightPane.rows.find((row) => row.focused)?.id ?? null,
      options,
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

export function getCommanderSelectedSize(entries: CommanderDirectoryEntry[], selectedIds: string[]) {
  const totalBytes = entries
    .filter((entry) => selectedIds.includes(entry.id))
    .reduce((currentTotal, entry) => currentTotal + (entry.sizeBytes ?? 0), 0)

  return formatSelectedSize(totalBytes)
}
