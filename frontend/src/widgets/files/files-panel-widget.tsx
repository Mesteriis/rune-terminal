import { useEffect, useState } from 'react'

import {
  listFilesDirectory,
  type FilesDirectoryEntry,
  type FilesDirectorySnapshot,
} from '@/features/files/api/client'
import { Box, ScrollArea, Text } from '@/shared/ui/primitives'
import {
  filesPanelHeaderStyle,
  filesPanelListInnerStyle,
  filesPanelListStyle,
  filesPanelPathStyle,
  filesPanelRootStyle,
  filesPanelRowNameStyle,
  filesPanelRowStyle,
  filesPanelStateStyle,
  filesPanelTitleStyle,
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
  const [state, setState] = useState<FilesPanelLoadState>({
    errorMessage: null,
    snapshot: null,
    status: 'loading',
  })

  useEffect(() => {
    let isCancelled = false

    setState({
      errorMessage: null,
      snapshot: null,
      status: 'loading',
    })

    listFilesDirectory(path)
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
  }, [path])

  return (
    <Box runaComponent="files-panel-root" style={filesPanelRootStyle}>
      <Box runaComponent="files-panel-header" style={filesPanelHeaderStyle}>
        <Text runaComponent="files-panel-title" style={filesPanelTitleStyle}>
          {title}
        </Text>
        <Text runaComponent="files-panel-path" style={filesPanelPathStyle}>
          {path}
        </Text>
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
          {state.status === 'ready'
            ? state.snapshot.entries.map((entry) => (
                <Box key={entry.id} runaComponent="files-panel-row" style={filesPanelRowStyle}>
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
