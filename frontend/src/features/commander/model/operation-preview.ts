import type {
  CommanderDirectoryEntry,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderRenamePreviewItem,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

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

function buildCommanderCloneName(entry: CommanderDirectoryEntry, suffixIndex: number) {
  const { baseName, ext } = splitEntryBaseNameAndExt(entry)
  const suffix = suffixIndex <= 1 ? '-copy' : `-copy-${suffixIndex}`

  if (entry.kind === 'file' && ext) {
    return `${baseName}${suffix}.${ext}`
  }

  return `${entry.name}${suffix}`
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

function applyCommanderRenameTemplate(entry: CommanderDirectoryEntry, template: string, index: number) {
  const normalizedTemplate = template.trim()

  if (!normalizedTemplate) {
    return ''
  }

  const { baseName, ext } = splitEntryBaseNameAndExt(entry)
  const usesFullNameToken = /\[F(?::[a-z])?\]/i.test(normalizedTemplate)
  const usesExtensionToken = /\[E(?::[a-z])?\]/i.test(normalizedTemplate)
  let nextName = normalizedTemplate
    .replace(
      /\[C(?::(\d+))?(?::(\d+))?(?::(\d+))?\]/gi,
      (
        _match,
        firstValue: string | undefined,
        secondValue: string | undefined,
        thirdValue: string | undefined,
      ) => {
        const first = firstValue ? Number.parseInt(firstValue, 10) : undefined
        const second = secondValue ? Number.parseInt(secondValue, 10) : undefined
        const third = thirdValue ? Number.parseInt(thirdValue, 10) : undefined

        const start = Number.isFinite(second) ? (first ?? 1) : 1
        const width = Number.isFinite(second) ? second : first
        const step = Number.isFinite(third) ? (third ?? 1) : 1
        const counter = start + index * step

        return formatRenameCounter(counter, Number.isFinite(width) ? width : undefined)
      },
    )
    .replace(/\[(N|E|F)(?::([a-z]))?\]/gi, (_match, token: 'N' | 'E' | 'F', modifier: string | undefined) => {
      const rawValue = token === 'N' ? baseName : token === 'E' ? ext : entry.name

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

function getPaneState(widgetState: CommanderWidgetRuntimeState, paneId: CommanderPaneId) {
  return paneId === 'left' ? widgetState.leftPane : widgetState.rightPane
}

function resolveEntriesInOrder(paneState: CommanderPaneRuntimeState, entryIds: string[]) {
  return entryIds
    .map((entryId) => paneState.directoryEntries.find((entry) => entry.id === entryId) ?? null)
    .filter((entry): entry is CommanderDirectoryEntry => Boolean(entry))
}

export function getCommanderConflictingEntryNames(
  widgetState: CommanderWidgetRuntimeState,
  sourcePaneId: CommanderPaneId,
  entryIds: string[],
) {
  const sourcePane = getPaneState(widgetState, sourcePaneId)
  const targetPane = getPaneState(widgetState, sourcePaneId === 'left' ? 'right' : 'left')

  if (sourcePane.path === targetPane.path) {
    return []
  }

  const targetNames = new Set(targetPane.directoryEntries.map((entry) => normalizeEntryName(entry.name)))

  return resolveEntriesInOrder(sourcePane, entryIds)
    .map((entry) => entry.name)
    .filter((entryName) => targetNames.has(normalizeEntryName(entryName)))
}

export function getCommanderEntryNameConflict(
  paneState: CommanderPaneRuntimeState,
  name: string,
  ignoreEntryId?: string,
) {
  const normalizedName = normalizeEntryName(name)

  return paneState.directoryEntries.some((entry) => {
    if (ignoreEntryId && entry.id === ignoreEntryId) {
      return false
    }

    return normalizeEntryName(entry.name) === normalizedName
  })
}

export function suggestCommanderCloneName(paneState: CommanderPaneRuntimeState, entryId: string) {
  const entry = paneState.directoryEntries.find((candidateEntry) => candidateEntry.id === entryId)

  if (!entry) {
    return null
  }

  let suffixIndex = 1
  while (suffixIndex < 1000) {
    const candidateName = buildCommanderCloneName(entry, suffixIndex)

    if (!getCommanderEntryNameConflict(paneState, candidateName, entry.id)) {
      return candidateName
    }

    suffixIndex += 1
  }

  return buildCommanderCloneName(entry, suffixIndex)
}

export function previewCommanderCloneEntries(
  paneState: CommanderPaneRuntimeState,
  entryIds: string[],
  template: string,
) {
  return previewCommanderRenameEntries(paneState, entryIds, template)
}

export function previewCommanderRenameEntries(
  paneState: CommanderPaneRuntimeState,
  entryIds: string[],
  template: string,
) {
  const renameEntries = resolveEntriesInOrder(paneState, entryIds)
  const renameEntryIdSet = new Set(renameEntries.map((entry) => entry.id))
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
    const hasDirectoryConflict = paneState.directoryEntries.some((entry) => {
      if (renameEntryIdSet.has(entry.id)) {
        return false
      }

      return normalizeEntryName(entry.name) === normalizedNextName
    })

    item.conflict = hasDuplicateTarget || hasDirectoryConflict
    item.status = hasDuplicateTarget ? 'duplicate' : hasDirectoryConflict ? 'conflict' : 'ok'

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
