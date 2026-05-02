import { useEffect, useState, type KeyboardEvent } from 'react'

import type { AppLocale } from '@/shared/api/runtime'
import {
  listFilesDirectory,
  openFilesPathExternally,
  type FilesDirectoryEntry,
  type FilesDirectorySnapshot,
} from '@/features/files/api/client'
import { createAgentAttachmentReference } from '@/features/agent/api/client'
import { createSplitTerminalWidget } from '@/features/terminal/api/client'
import { getRuntimePathParent, joinRuntimePath } from '@/shared/api/runtime'
import { openPreviewWorkspaceWidget } from '@/shared/api/workspace'
import { openAiSidebar } from '@/shared/model/app'
import { queueAiAttachmentReference } from '@/shared/model/ai-attachments'
import { writeTextToClipboard } from '@/shared/model/clipboard'
import { Box, Button, Input, ScrollArea, Text } from '@/shared/ui/primitives'
import {
  filesPanelControlsStyle,
  filesPanelFilterInputStyle,
  filesPanelHeaderMetaStyle,
  filesPanelHeaderStyle,
  filesPanelListInnerStyle,
  filesPanelListHeaderStyle,
  filesPanelListStyle,
  filesPanelParentButtonStyle,
  filesPanelPathInputStyle,
  filesPanelPathStyle,
  filesPanelRootStyle,
  filesPanelRowActionButtonStyle,
  filesPanelRowActionsStyle,
  filesPanelRowNameStyle,
  filesPanelSortButtonActiveStyle,
  filesPanelSortButtonEndAlignedStyle,
  filesPanelSortButtonStyle,
  filesPanelStateStyle,
  filesPanelTitleStyle,
  resolveFilesPanelRowStyle,
} from './files-panel-widget.styles'
import { filesPanelWidgetCopy } from './files-panel-widget-copy'

export type FilesPanelWidgetProps = {
  connectionId?: string
  locale?: AppLocale
  onOpenPreview?: (preview: { connectionId?: string; path: string; title: string; widgetId: string }) => void
  onOpenTerminal?: (terminal: { tabId: string; title: string; widgetId: string }) => void
  path: string
  title: string
  widgetId?: string
}

type FilesPanelLoadState =
  | { status: 'loading'; snapshot: null; errorMessage: null }
  | { status: 'ready'; snapshot: FilesDirectorySnapshot; errorMessage: null }
  | { status: 'error'; snapshot: null; errorMessage: string }

type FilesPanelSortMode = 'kind' | 'modified' | 'name' | 'size'
type FilesPanelSortDirection = 'asc' | 'desc'

type FilesPanelSortState = {
  direction: FilesPanelSortDirection
  mode: FilesPanelSortMode
}

type FilesPanelOpenState =
  | { status: 'idle'; entryName: null; message: null }
  | { status: 'pending'; entryName: string; message: string }
  | { status: 'success'; entryName: string; message: string }
  | { status: 'error'; entryName: string; message: string }

function getEntryKindLabel(entry: FilesDirectoryEntry) {
  return entry.kind === 'directory' ? 'DIR' : 'FILE'
}

function getEntryKindRank(entry: FilesDirectoryEntry) {
  return entry.kind === 'directory' ? 0 : 1
}

function getDefaultSortDirection(mode: FilesPanelSortMode): FilesPanelSortDirection {
  return mode === 'modified' || mode === 'size' ? 'desc' : 'asc'
}

function renderSortLabel(label: string, mode: FilesPanelSortMode, sort: FilesPanelSortState) {
  if (sort.mode !== mode) {
    return label
  }

  return `${label} ${sort.direction.toUpperCase()}`
}

function formatEntryCount(visibleCount: number, totalCount: number, locale: AppLocale) {
  const entryLabel = totalCount === 1 ? 'entry' : 'entries'

  if (visibleCount === totalCount) {
    if (locale === 'ru') {
      return `${totalCount} элементов`
    }
    if (locale === 'zh-CN') {
      return `${totalCount} 个条目`
    }
    if (locale === 'es') {
      return `${totalCount} entradas`
    }
    return `${totalCount} ${entryLabel}`
  }

  if (locale === 'ru') {
    return `${visibleCount} из ${totalCount} элементов`
  }
  if (locale === 'zh-CN') {
    return `${visibleCount} / ${totalCount} 个条目`
  }
  if (locale === 'es') {
    return `${visibleCount} de ${totalCount} entradas`
  }
  return `${visibleCount} of ${totalCount} ${entryLabel}`
}

function getPathTitle(path: string, fallbackTitle: string) {
  const trimmedPath = path.replace(/\/+$/g, '')
  const lastSegment = trimmedPath.split('/').filter(Boolean).pop()

  return lastSegment || trimmedPath || fallbackTitle
}

function sortFilesPanelEntries(entries: FilesDirectoryEntry[], sort: FilesPanelSortState) {
  const sortedEntries = [...entries]

  sortedEntries.sort((leftEntry, rightEntry) => {
    const leftKindRank = getEntryKindRank(leftEntry)
    const rightKindRank = getEntryKindRank(rightEntry)

    if (sort.mode !== 'kind' && leftKindRank !== rightKindRank) {
      return leftKindRank - rightKindRank
    }

    let compareResult = 0

    if (sort.mode === 'kind') {
      compareResult = leftKindRank - rightKindRank
    }

    if (sort.mode === 'modified' && compareResult === 0) {
      compareResult = leftEntry.modifiedTime - rightEntry.modifiedTime
    }

    if (sort.mode === 'size' && compareResult === 0) {
      compareResult = leftEntry.sizeBytes - rightEntry.sizeBytes
    }

    if (compareResult === 0) {
      compareResult = leftEntry.name.localeCompare(rightEntry.name)
    }

    return sort.direction === 'desc' ? compareResult * -1 : compareResult
  })

  return sortedEntries
}

export function FilesPanelWidget({
  connectionId,
  locale = 'en',
  onOpenPreview,
  onOpenTerminal,
  path,
  title,
  widgetId,
}: FilesPanelWidgetProps) {
  const copy = filesPanelWidgetCopy[locale]
  const [currentPath, setCurrentPath] = useState(path)
  const [pathDraft, setPathDraft] = useState(path)
  const [filterValue, setFilterValue] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [sort, setSort] = useState<FilesPanelSortState>({
    direction: 'asc',
    mode: 'name',
  })
  const [openState, setOpenState] = useState<FilesPanelOpenState>({
    entryName: null,
    message: null,
    status: 'idle',
  })
  const [state, setState] = useState<FilesPanelLoadState>({
    errorMessage: null,
    snapshot: null,
    status: 'loading',
  })

  useEffect(() => {
    setCurrentPath(path)
    setPathDraft(path)
  }, [path])

  useEffect(() => {
    setPathDraft(currentPath)
    setOpenState({
      entryName: null,
      message: null,
      status: 'idle',
    })
  }, [currentPath])

  useEffect(() => {
    const abortController = new AbortController()

    setState({
      errorMessage: null,
      snapshot: null,
      status: 'loading',
    })

    const directoryRequest = listFilesDirectory(currentPath, {
      connectionId,
      signal: abortController.signal,
      widgetId,
    })

    directoryRequest
      .then((snapshot) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          errorMessage: null,
          snapshot,
          status: 'ready',
        })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          errorMessage: error instanceof Error ? error.message : 'Unable to load directory',
          snapshot: null,
          status: 'error',
        })
      })

    return () => {
      abortController.abort()
    }
  }, [connectionId, currentPath, refreshNonce])

  const handleOpenParent = () => {
    const parentPath = getRuntimePathParent(currentPath)

    if (parentPath) {
      setCurrentPath(parentPath)
    }
  }

  const handleOpenPath = () => {
    const nextPath = pathDraft.trim()

    if (!nextPath) {
      setPathDraft(currentPath)
      return
    }

    if (nextPath !== currentPath) {
      setCurrentPath(nextPath)
      return
    }

    setPathDraft(currentPath)
  }

  const handleOpenCurrentDirectory = async () => {
    setOpenState({
      entryName: currentPath,
      message: `Opening ${currentPath}`,
      status: 'pending',
    })

    try {
      await openFilesPathExternally(currentPath, { connectionId, widgetId })
      setOpenState({
        entryName: currentPath,
        message:
          locale === 'en' ? 'Open request sent for current directory' : copy.openCurrentDirectoryExternally,
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: currentPath,
        message: error instanceof Error ? error.message : 'Unable to open current directory',
        status: 'error',
      })
    }
  }

  const handleOpenEntry = async (entry: FilesDirectoryEntry) => {
    if (entry.kind === 'directory') {
      setCurrentPath(joinRuntimePath(currentPath, entry.name))
      return
    }

    await handleOpenFileExternally(entry)
  }

  const handleOpenFileExternally = async (entry: FilesDirectoryEntry) => {
    setOpenState({
      entryName: entry.name,
      message: `Opening ${entry.name}`,
      status: 'pending',
    })

    try {
      const targetPath = joinRuntimePath(currentPath, entry.name)
      await openFilesPathExternally(targetPath, { connectionId, widgetId })
      setOpenState({
        entryName: entry.name,
        message: locale === 'en' ? `Open request sent for ${entry.name}` : copy.openFile(entry.name),
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: entry.name,
        message: error instanceof Error ? error.message : `Unable to open ${entry.name}`,
        status: 'error',
      })
    }
  }

  const handleOpenContainingFolder = async (entry: FilesDirectoryEntry) => {
    setOpenState({
      entryName: entry.name,
      message: `Opening containing folder for ${entry.name}`,
      status: 'pending',
    })

    try {
      await openFilesPathExternally(currentPath, { connectionId, widgetId })
      setOpenState({
        entryName: entry.name,
        message:
          locale === 'en'
            ? `Open request sent for containing folder of ${entry.name}`
            : copy.openContainingFolderForFile(entry.name),
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: entry.name,
        message:
          error instanceof Error ? error.message : `Unable to open containing folder for ${entry.name}`,
        status: 'error',
      })
    }
  }

  const handlePreviewEntry = async (entry: FilesDirectoryEntry) => {
    if (!widgetId) {
      setOpenState({
        entryName: entry.name,
        message: copy.previewTargetUnavailable,
        status: 'error',
      })
      return
    }

    const previewPath = joinRuntimePath(currentPath, entry.name)

    setOpenState({
      entryName: entry.name,
      message: `Opening preview for ${entry.name}`,
      status: 'pending',
    })

    try {
      const result = await openPreviewWorkspaceWidget({
        connectionId,
        path: previewPath,
        targetWidgetId: widgetId,
      })

      onOpenPreview?.({
        connectionId,
        path: previewPath,
        title: entry.name,
        widgetId: result.widget_id,
      })
      setOpenState({
        entryName: entry.name,
        message: locale === 'en' ? `Preview widget opened for ${entry.name}` : copy.previewFile(entry.name),
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: entry.name,
        message: error instanceof Error ? error.message : `Unable to preview ${entry.name}`,
        status: 'error',
      })
    }
  }

  const handleCopyPath = async (targetPath: string, label: string) => {
    setOpenState({
      entryName: label,
      message: copy.copyingPathFor(label),
      status: 'pending',
    })

    try {
      await writeTextToClipboard(targetPath)
      setOpenState({
        entryName: label,
        message: copy.copiedPathFor(label),
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: label,
        message: error instanceof Error ? error.message : `Unable to copy path for ${label}`,
        status: 'error',
      })
    }
  }

  const handleAttachToAi = async (entry: FilesDirectoryEntry) => {
    const targetPath = joinRuntimePath(currentPath, entry.name)

    setOpenState({
      entryName: entry.name,
      message: `Attaching ${entry.name} to AI`,
      status: 'pending',
    })

    try {
      const attachment = await createAgentAttachmentReference({
        action_source: 'frontend.files.attach_to_ai',
        path: targetPath,
      })
      queueAiAttachmentReference(attachment)
      openAiSidebar()
      setOpenState({
        entryName: entry.name,
        message: `Attached ${entry.name} to AI composer`,
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: entry.name,
        message: error instanceof Error ? error.message : `Unable to attach ${entry.name} to AI`,
        status: 'error',
      })
    }
  }

  const handleOpenTerminalHere = async (targetPath: string, label: string) => {
    if (!widgetId) {
      setOpenState({
        entryName: label,
        message: copy.terminalTargetUnavailable,
        status: 'error',
      })
      return
    }

    const terminalTitle = `${copy.shellTitle}: ${getPathTitle(targetPath, copy.shellTitle)}`

    setOpenState({
      entryName: label,
      message: `Opening terminal for ${label}`,
      status: 'pending',
    })

    try {
      const result = await createSplitTerminalWidget({
        connectionId,
        targetWidgetId: widgetId,
        title: terminalTitle,
        workingDir: targetPath,
      })

      onOpenTerminal?.({
        tabId: result.tab_id,
        title: terminalTitle,
        widgetId: result.widget_id,
      })
      setOpenState({
        entryName: label,
        message: `Terminal opened for ${label}`,
        status: 'success',
      })
    } catch (error: unknown) {
      setOpenState({
        entryName: label,
        message: error instanceof Error ? error.message : `Unable to open terminal for ${label}`,
        status: 'error',
      })
    }
  }

  const handleFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setFilterValue('')
    }
  }

  const handlePathKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleOpenPath()
      return
    }

    if (event.key === 'Escape') {
      setPathDraft(currentPath)
    }
  }

  const handleSort = (mode: FilesPanelSortMode) => {
    setSort((currentSort) => {
      if (currentSort.mode !== mode) {
        return {
          direction: getDefaultSortDirection(mode),
          mode,
        }
      }

      return {
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        mode,
      }
    })
  }

  const handleEntryKeyDown = (event: KeyboardEvent<HTMLDivElement>, entry: FilesDirectoryEntry) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    void handleOpenEntry(entry)
  }

  const parentPath = getRuntimePathParent(currentPath)
  const normalizedFilterValue = filterValue.trim().toLowerCase()
  const visibleEntries =
    state.status === 'ready'
      ? state.snapshot.entries.filter(
          (entry) =>
            (showHidden || !entry.hidden) &&
            (!normalizedFilterValue || entry.name.toLowerCase().includes(normalizedFilterValue)),
        )
      : []
  const sortedEntries = sortFilesPanelEntries(visibleEntries, sort)
  const entryCountLabel =
    state.status === 'ready'
      ? formatEntryCount(visibleEntries.length, state.snapshot.entries.length, locale)
      : null

  return (
    <Box runaComponent="files-panel-root" style={filesPanelRootStyle}>
      <Box runaComponent="files-panel-header" style={filesPanelHeaderStyle}>
        <Box runaComponent="files-panel-header-meta" style={filesPanelHeaderMetaStyle}>
          <Text runaComponent="files-panel-title" style={filesPanelTitleStyle}>
            {title}
          </Text>
          <Text runaComponent="files-panel-path" style={filesPanelPathStyle}>
            {currentPath}
          </Text>
          {entryCountLabel ? (
            <Text runaComponent="files-panel-entry-count" style={filesPanelPathStyle}>
              {entryCountLabel}
            </Text>
          ) : null}
        </Box>
        <Box runaComponent="files-panel-controls" style={filesPanelControlsStyle}>
          <Input
            aria-label={copy.path}
            onChange={(event) => setPathDraft(event.target.value)}
            onKeyDown={handlePathKeyDown}
            placeholder={copy.pathPlaceholder}
            runaComponent="files-panel-path-input"
            style={filesPanelPathInputStyle}
            value={pathDraft}
          />
          <Button
            aria-label={copy.openFilesPath}
            onClick={handleOpenPath}
            runaComponent="files-panel-open-path"
            style={filesPanelParentButtonStyle}
          >
            {copy.open}
          </Button>
          <Input
            aria-label={copy.filterFiles}
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={handleFilterKeyDown}
            placeholder={copy.filter}
            runaComponent="files-panel-filter"
            style={filesPanelFilterInputStyle}
            value={filterValue}
          />
          {filterValue ? (
            <Button
              aria-label={copy.clearFilesFilter}
              onClick={() => setFilterValue('')}
              runaComponent="files-panel-clear-filter"
              style={filesPanelParentButtonStyle}
            >
              {copy.clear}
            </Button>
          ) : null}
          <Button
            aria-label={showHidden ? copy.hideHiddenFiles : copy.showHiddenFiles}
            aria-pressed={showHidden}
            onClick={() => setShowHidden((value) => !value)}
            runaComponent="files-panel-toggle-hidden"
            style={filesPanelParentButtonStyle}
          >
            {showHidden ? copy.hiddenOn : copy.hiddenOff}
          </Button>
          <Button
            aria-label={copy.refreshDirectory}
            onClick={() => setRefreshNonce((value) => value + 1)}
            runaComponent="files-panel-refresh"
            style={filesPanelParentButtonStyle}
          >
            {copy.refresh}
          </Button>
          <Button
            aria-label={copy.openCurrentDirectoryExternally}
            onClick={() => {
              void handleOpenCurrentDirectory()
            }}
            runaComponent="files-panel-open-current-directory"
            style={filesPanelParentButtonStyle}
          >
            {copy.openDir}
          </Button>
          <Button
            aria-label={copy.openTerminalInCurrentDirectory}
            disabled={!widgetId}
            onClick={() => {
              void handleOpenTerminalHere(currentPath, copy.currentDirectory)
            }}
            runaComponent="files-panel-open-current-terminal"
            style={filesPanelParentButtonStyle}
          >
            {copy.terminal}
          </Button>
          <Button
            aria-label={copy.copyCurrentDirectoryPath}
            onClick={() => {
              void handleCopyPath(currentPath, copy.currentDirectory)
            }}
            runaComponent="files-panel-copy-current-directory"
            style={filesPanelParentButtonStyle}
          >
            {copy.copyPath}
          </Button>
          <Button
            aria-label={copy.openParentDirectory}
            disabled={!parentPath}
            onClick={handleOpenParent}
            runaComponent="files-panel-open-parent"
            style={filesPanelParentButtonStyle}
          >
            {copy.parent}
          </Button>
        </Box>
      </Box>
      <ScrollArea runaComponent="files-panel-list" style={filesPanelListStyle}>
        <Box runaComponent="files-panel-list-inner" style={filesPanelListInnerStyle}>
          <Box runaComponent="files-panel-list-header" style={filesPanelListHeaderStyle}>
            <Button
              aria-label={copy.sortByKind}
              onClick={() => handleSort('kind')}
              runaComponent="files-panel-sort-kind"
              style={{
                ...filesPanelSortButtonStyle,
                ...(sort.mode === 'kind' ? filesPanelSortButtonActiveStyle : null),
              }}
            >
              {renderSortLabel(copy.kind, 'kind', sort)}
            </Button>
            <Button
              aria-label={copy.sortByName}
              onClick={() => handleSort('name')}
              runaComponent="files-panel-sort-name"
              style={{
                ...filesPanelSortButtonStyle,
                ...(sort.mode === 'name' ? filesPanelSortButtonActiveStyle : null),
              }}
            >
              {renderSortLabel(copy.name, 'name', sort)}
            </Button>
            <Button
              aria-label={copy.sortBySize}
              onClick={() => handleSort('size')}
              runaComponent="files-panel-sort-size"
              style={{
                ...filesPanelSortButtonStyle,
                ...filesPanelSortButtonEndAlignedStyle,
                ...(sort.mode === 'size' ? filesPanelSortButtonActiveStyle : null),
              }}
            >
              {renderSortLabel(copy.size, 'size', sort)}
            </Button>
            <Button
              aria-label={copy.sortByModified}
              onClick={() => handleSort('modified')}
              runaComponent="files-panel-sort-modified"
              style={{
                ...filesPanelSortButtonStyle,
                ...filesPanelSortButtonEndAlignedStyle,
                ...(sort.mode === 'modified' ? filesPanelSortButtonActiveStyle : null),
              }}
            >
              {renderSortLabel(copy.modified, 'modified', sort)}
            </Button>
            <Text runaComponent="files-panel-column-actions" style={filesPanelSortButtonEndAlignedStyle}>
              {copy.actions}
            </Text>
          </Box>
          {state.status === 'loading' ? (
            <Text runaComponent="files-panel-loading" style={filesPanelStateStyle}>
              {copy.loadingDirectory}
            </Text>
          ) : null}
          {state.status === 'error' ? (
            <Text runaComponent="files-panel-error" style={filesPanelStateStyle}>
              {state.errorMessage}
            </Text>
          ) : null}
          {state.status === 'ready' && state.snapshot.entries.length === 0 ? (
            <Text runaComponent="files-panel-empty" style={filesPanelStateStyle}>
              {copy.directoryEmpty}
            </Text>
          ) : null}
          {state.status === 'ready' && state.snapshot.entries.length > 0 && visibleEntries.length === 0 ? (
            <Text runaComponent="files-panel-filter-empty" style={filesPanelStateStyle}>
              {normalizedFilterValue ? copy.noEntriesMatchFilter : copy.noVisibleEntries}
            </Text>
          ) : null}
          {openState.status === 'pending' ? (
            <Text runaComponent="files-panel-open-pending" style={filesPanelStateStyle}>
              {openState.message}
            </Text>
          ) : null}
          {openState.status === 'success' ? (
            <Text runaComponent="files-panel-open-success" style={filesPanelStateStyle}>
              {openState.message}
            </Text>
          ) : null}
          {openState.status === 'error' ? (
            <Text runaComponent="files-panel-open-error" style={filesPanelStateStyle}>
              {openState.message}
            </Text>
          ) : null}
          {state.status === 'ready'
            ? sortedEntries.map((entry) => (
                <Box
                  aria-label={entry.kind === 'directory' ? copy.openDirectory(entry.name) : undefined}
                  key={entry.id}
                  onClick={
                    entry.kind === 'directory'
                      ? () => {
                          void handleOpenEntry(entry)
                        }
                      : undefined
                  }
                  onKeyDown={
                    entry.kind === 'directory' ? (event) => handleEntryKeyDown(event, entry) : undefined
                  }
                  role={entry.kind === 'directory' ? 'button' : undefined}
                  runaComponent="files-panel-row"
                  style={resolveFilesPanelRowStyle(entry.kind === 'directory')}
                  tabIndex={entry.kind === 'directory' ? 0 : undefined}
                >
                  <Text runaComponent="files-panel-row-kind">{getEntryKindLabel(entry)}</Text>
                  <Text runaComponent="files-panel-row-name" style={filesPanelRowNameStyle}>
                    {entry.name}
                  </Text>
                  <Text runaComponent="files-panel-row-size">{entry.sizeLabel}</Text>
                  <Text runaComponent="files-panel-row-modified">{entry.modified}</Text>
                  {entry.kind === 'file' ? (
                    <Box runaComponent="files-panel-row-actions" style={filesPanelRowActionsStyle}>
                      <Button
                        aria-label={copy.previewFile(entry.name)}
                        disabled={!widgetId}
                        onClick={() => {
                          void handlePreviewEntry(entry)
                        }}
                        runaComponent="files-panel-row-preview"
                        style={filesPanelRowActionButtonStyle}
                      >
                        {copy.preview}
                      </Button>
                      <Button
                        aria-label={copy.openFile(entry.name)}
                        onClick={() => {
                          void handleOpenFileExternally(entry)
                        }}
                        runaComponent="files-panel-row-open"
                        style={filesPanelRowActionButtonStyle}
                      >
                        {copy.open}
                      </Button>
                      <Button
                        aria-label={copy.openContainingFolderForFile(entry.name)}
                        onClick={() => {
                          void handleOpenContainingFolder(entry)
                        }}
                        runaComponent="files-panel-row-open-folder"
                        style={filesPanelRowActionButtonStyle}
                      >
                        {copy.folder}
                      </Button>
                      <Button
                        aria-label={copy.openTerminalForFile(entry.name)}
                        disabled={!widgetId}
                        onClick={() => {
                          void handleOpenTerminalHere(currentPath, entry.name)
                        }}
                        runaComponent="files-panel-row-open-terminal"
                        style={filesPanelRowActionButtonStyle}
                      >
                        {copy.term}
                      </Button>
                      <Button
                        aria-label={copy.copyPathForFile(entry.name)}
                        onClick={() => {
                          void handleCopyPath(joinRuntimePath(currentPath, entry.name), entry.name)
                        }}
                        runaComponent="files-panel-row-copy-path"
                        style={filesPanelRowActionButtonStyle}
                      >
                        {copy.copy}
                      </Button>
                      <Button
                        aria-label={copy.attachFileToAi(entry.name)}
                        onClick={() => {
                          void handleAttachToAi(entry)
                        }}
                        runaComponent="files-panel-row-attach-ai"
                        style={filesPanelRowActionButtonStyle}
                      >
                        AI
                      </Button>
                    </Box>
                  ) : (
                    <Text
                      runaComponent="files-panel-row-actions-empty"
                      style={filesPanelSortButtonEndAlignedStyle}
                    >
                      {copy.folder}
                    </Text>
                  )}
                </Box>
              ))
            : null}
        </Box>
      </ScrollArea>
    </Box>
  )
}
