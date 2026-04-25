import { useEffect, useState, type KeyboardEvent } from 'react'

import {
  listFilesDirectory,
  type FilesDirectoryEntry,
  type FilesDirectorySnapshot,
} from '@/features/files/api/client'
import { getRuntimePathParent, joinRuntimePath } from '@/shared/api/runtime'
import { Box, Button, Input, ScrollArea, Text } from '@/shared/ui/primitives'
import {
  filesPanelControlsStyle,
  filesPanelFilterInputStyle,
  filesPanelHeaderMetaStyle,
  filesPanelHeaderStyle,
  filesPanelListInnerStyle,
  filesPanelListStyle,
  filesPanelParentButtonStyle,
  filesPanelPathStyle,
  filesPanelRootStyle,
  filesPanelRowNameStyle,
  filesPanelStateStyle,
  filesPanelTitleStyle,
  resolveFilesPanelRowStyle,
} from './files-panel-widget.styles'

export type FilesPanelWidgetProps = {
  path: string
  title: string
}

type FilesPanelLoadState =
  | { status: 'loading'; snapshot: null; errorMessage: null }
  | { status: 'ready'; snapshot: FilesDirectorySnapshot; errorMessage: null }
  | { status: 'error'; snapshot: null; errorMessage: string }

function getEntryKindLabel(entry: FilesDirectoryEntry) {
  return entry.kind === 'directory' ? 'DIR' : 'FILE'
}

export function FilesPanelWidget({ path, title }: FilesPanelWidgetProps) {
  const [currentPath, setCurrentPath] = useState(path)
  const [filterValue, setFilterValue] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [state, setState] = useState<FilesPanelLoadState>({
    errorMessage: null,
    snapshot: null,
    status: 'loading',
  })

  useEffect(() => {
    setCurrentPath(path)
  }, [path])

  useEffect(() => {
    let isCancelled = false

    setState({
      errorMessage: null,
      snapshot: null,
      status: 'loading',
    })

    listFilesDirectory(currentPath)
      .then((snapshot) => {
        if (isCancelled) {
          return
        }

        setState({
          errorMessage: null,
          snapshot,
          status: 'ready',
        })
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setState({
          errorMessage: error instanceof Error ? error.message : 'Unable to load directory',
          snapshot: null,
          status: 'error',
        })
      })

    return () => {
      isCancelled = true
    }
  }, [currentPath, refreshNonce])

  const handleOpenParent = () => {
    const parentPath = getRuntimePathParent(currentPath)

    if (parentPath) {
      setCurrentPath(parentPath)
    }
  }

  const handleOpenEntry = (entry: FilesDirectoryEntry) => {
    if (entry.kind !== 'directory') {
      return
    }

    setCurrentPath(joinRuntimePath(currentPath, entry.name))
  }

  const handleFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setFilterValue('')
    }
  }

  const handleEntryKeyDown = (event: KeyboardEvent<HTMLDivElement>, entry: FilesDirectoryEntry) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleOpenEntry(entry)
  }

  const parentPath = getRuntimePathParent(currentPath)
  const normalizedFilterValue = filterValue.trim().toLowerCase()
  const visibleEntries =
    state.status === 'ready' && normalizedFilterValue
      ? state.snapshot.entries.filter((entry) => entry.name.toLowerCase().includes(normalizedFilterValue))
      : state.status === 'ready'
        ? state.snapshot.entries
        : []

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
        </Box>
        <Box runaComponent="files-panel-controls" style={filesPanelControlsStyle}>
          <Input
            aria-label="Filter files"
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={handleFilterKeyDown}
            placeholder="Filter"
            runaComponent="files-panel-filter"
            style={filesPanelFilterInputStyle}
            value={filterValue}
          />
          {filterValue ? (
            <Button
              aria-label="Clear files filter"
              onClick={() => setFilterValue('')}
              runaComponent="files-panel-clear-filter"
              style={filesPanelParentButtonStyle}
            >
              Clear
            </Button>
          ) : null}
          <Button
            aria-label="Refresh directory"
            onClick={() => setRefreshNonce((value) => value + 1)}
            runaComponent="files-panel-refresh"
            style={filesPanelParentButtonStyle}
          >
            Refresh
          </Button>
          <Button
            aria-label="Open parent directory"
            disabled={!parentPath}
            onClick={handleOpenParent}
            runaComponent="files-panel-open-parent"
            style={filesPanelParentButtonStyle}
          >
            Parent
          </Button>
        </Box>
      </Box>
      <ScrollArea runaComponent="files-panel-list" style={filesPanelListStyle}>
        <Box runaComponent="files-panel-list-inner" style={filesPanelListInnerStyle}>
          {state.status === 'loading' ? (
            <Text runaComponent="files-panel-loading" style={filesPanelStateStyle}>
              Loading directory
            </Text>
          ) : null}
          {state.status === 'error' ? (
            <Text runaComponent="files-panel-error" style={filesPanelStateStyle}>
              {state.errorMessage}
            </Text>
          ) : null}
          {state.status === 'ready' && state.snapshot.entries.length === 0 ? (
            <Text runaComponent="files-panel-empty" style={filesPanelStateStyle}>
              Directory is empty
            </Text>
          ) : null}
          {state.status === 'ready' && state.snapshot.entries.length > 0 && visibleEntries.length === 0 ? (
            <Text runaComponent="files-panel-filter-empty" style={filesPanelStateStyle}>
              No entries match filter
            </Text>
          ) : null}
          {state.status === 'ready'
            ? visibleEntries.map((entry) => (
                <Box
                  aria-label={entry.kind === 'directory' ? `Open directory ${entry.name}` : undefined}
                  key={entry.id}
                  onClick={() => handleOpenEntry(entry)}
                  onKeyDown={(event) => handleEntryKeyDown(event, entry)}
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
                </Box>
              ))
            : null}
        </Box>
      </ScrollArea>
    </Box>
  )
}
