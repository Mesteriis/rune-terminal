import { useEffect, useRef, useState } from 'react'

import {
  openPreviewPathExternally,
  readPreviewFile,
  type PreviewFileSnapshot,
} from '@/features/preview/api/client'
import { getRuntimePathParent } from '@/shared/api/runtime'
import { writeTextToClipboard } from '@/shared/model/clipboard'
import { Box, Button, ScrollArea, Text } from '@/shared/ui/primitives'
import {
  previewPanelBodyInnerStyle,
  previewPanelBodyStyle,
  previewPanelCodeStyle,
  previewPanelHandoffStatusStyle,
  previewPanelHeaderActionsStyle,
  previewPanelHeaderMetaStyle,
  previewPanelHeaderStyle,
  previewPanelMetaStyle,
  previewPanelRefreshButtonStyle,
  previewPanelRootStyle,
  previewPanelStateStyle,
  previewPanelTableCellStyle,
  previewPanelTableHeaderCellStyle,
  previewPanelTableStyle,
  previewPanelTableWrapStyle,
  previewPanelTitleStyle,
} from './preview-panel-widget.styles'
import { createPreviewTable } from './preview-table'

export type PreviewPanelWidgetProps = {
  connectionId?: string
  path: string
  title: string
}

type PreviewPanelLoadState =
  | { status: 'loading'; snapshot: null; errorMessage: null }
  | { status: 'ready'; snapshot: PreviewFileSnapshot; errorMessage: null }
  | { status: 'error'; snapshot: null; errorMessage: string }

type PreviewPanelExternalOpenState =
  | { status: 'idle'; message: null }
  | { status: 'pending'; message: null }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type PreviewPanelPathCopyState =
  | { status: 'idle'; message: null }
  | { status: 'pending'; message: null }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

function formatBytes(size?: number) {
  if (size == null) {
    return 'unknown size'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getPreviewKindLabel(snapshot: PreviewFileSnapshot) {
  return snapshot.previewKind === 'hex' ? 'Hex preview' : 'Text preview'
}

export function PreviewPanelWidget({ connectionId, path, title }: PreviewPanelWidgetProps) {
  const [refreshNonce, setRefreshNonce] = useState(0)
  const externalOpenRequestIdRef = useRef(0)
  const pathCopyRequestIdRef = useRef(0)
  const [externalOpenState, setExternalOpenState] = useState<PreviewPanelExternalOpenState>({
    message: null,
    status: 'idle',
  })
  const [pathCopyState, setPathCopyState] = useState<PreviewPanelPathCopyState>({
    message: null,
    status: 'idle',
  })
  const [state, setState] = useState<PreviewPanelLoadState>({
    errorMessage: null,
    snapshot: null,
    status: 'loading',
  })

  useEffect(() => {
    const abortController = new AbortController()

    setState({
      errorMessage: null,
      snapshot: null,
      status: 'loading',
    })

    const previewRequest = connectionId
      ? readPreviewFile(path, { connectionId, maxBytes: 65_536, signal: abortController.signal })
      : readPreviewFile(path, { maxBytes: 65_536, signal: abortController.signal })

    previewRequest
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
          errorMessage: error instanceof Error ? error.message : 'Unable to load preview',
          snapshot: null,
          status: 'error',
        })
      })

    return () => {
      abortController.abort()
    }
  }, [connectionId, path, refreshNonce])

  useEffect(() => {
    externalOpenRequestIdRef.current += 1
    pathCopyRequestIdRef.current += 1
    setExternalOpenState({
      message: null,
      status: 'idle',
    })
    setPathCopyState({
      message: null,
      status: 'idle',
    })
  }, [path])

  async function handleOpenExternally() {
    const requestId = externalOpenRequestIdRef.current + 1
    externalOpenRequestIdRef.current = requestId

    setExternalOpenState({
      message: null,
      status: 'pending',
    })

    try {
      await (connectionId
        ? openPreviewPathExternally(path, { connectionId })
        : openPreviewPathExternally(path))
      if (externalOpenRequestIdRef.current !== requestId) {
        return
      }

      setExternalOpenState({
        message: 'Preview file open request sent to the system opener.',
        status: 'success',
      })
    } catch (error) {
      if (externalOpenRequestIdRef.current !== requestId) {
        return
      }

      setExternalOpenState({
        message: error instanceof Error ? error.message : 'Unable to open preview file externally',
        status: 'error',
      })
    }
  }

  async function handleOpenContainingFolder() {
    const containingFolderPath = getRuntimePathParent(path)

    if (!containingFolderPath) {
      setExternalOpenState({
        message: 'Containing folder is unavailable',
        status: 'error',
      })
      return
    }

    const requestId = externalOpenRequestIdRef.current + 1
    externalOpenRequestIdRef.current = requestId

    setExternalOpenState({
      message: null,
      status: 'pending',
    })

    try {
      await (connectionId
        ? openPreviewPathExternally(containingFolderPath, { connectionId })
        : openPreviewPathExternally(containingFolderPath))
      if (externalOpenRequestIdRef.current !== requestId) {
        return
      }

      setExternalOpenState({
        message: 'Preview containing folder open request sent to the system opener.',
        status: 'success',
      })
    } catch (error) {
      if (externalOpenRequestIdRef.current !== requestId) {
        return
      }

      setExternalOpenState({
        message: error instanceof Error ? error.message : 'Unable to open preview containing folder',
        status: 'error',
      })
    }
  }

  async function handleCopyPath() {
    const requestId = pathCopyRequestIdRef.current + 1
    pathCopyRequestIdRef.current = requestId

    setPathCopyState({
      message: null,
      status: 'pending',
    })

    try {
      await writeTextToClipboard(path)
      if (pathCopyRequestIdRef.current !== requestId) {
        return
      }

      setPathCopyState({
        message: 'Copied preview file path to clipboard.',
        status: 'success',
      })
    } catch (error) {
      if (pathCopyRequestIdRef.current !== requestId) {
        return
      }

      setPathCopyState({
        message: error instanceof Error ? error.message : 'Unable to copy preview file path',
        status: 'error',
      })
    }
  }

  const containingFolderPath = getRuntimePathParent(path)
  const previewTable =
    state.status === 'ready' && state.snapshot.previewKind === 'text'
      ? createPreviewTable(path, state.snapshot.content)
      : null
  const previewSummary =
    state.status === 'ready'
      ? `${previewTable ? `${previewTable.delimiterLabel} table preview` : getPreviewKindLabel(state.snapshot)} · ${formatBytes(
          state.snapshot.sizeBytes,
        )}${state.snapshot.truncated ? ' · truncated' : ''}`
      : null
  const previewTableLimitLabel =
    previewTable?.truncatedColumns || previewTable?.truncatedRows
      ? `Table preview is bounded to ${previewTable.rows.length} rows and ${previewTable.columns.length} columns.`
      : null

  return (
    <Box runaComponent="preview-panel-root" style={previewPanelRootStyle}>
      <Box runaComponent="preview-panel-header" style={previewPanelHeaderStyle}>
        <Box runaComponent="preview-panel-header-meta" style={previewPanelHeaderMetaStyle}>
          <Text runaComponent="preview-panel-title" style={previewPanelTitleStyle}>
            {title}
          </Text>
          <Text runaComponent="preview-panel-path" style={previewPanelMetaStyle}>
            {path}
          </Text>
          {previewSummary ? (
            <Text runaComponent="preview-panel-summary" style={previewPanelMetaStyle}>
              {previewSummary}
            </Text>
          ) : null}
          {externalOpenState.message ? (
            <Text runaComponent="preview-panel-handoff-status" style={previewPanelHandoffStatusStyle}>
              {externalOpenState.message}
            </Text>
          ) : null}
          {pathCopyState.message ? (
            <Text runaComponent="preview-panel-copy-status" style={previewPanelHandoffStatusStyle}>
              {pathCopyState.message}
            </Text>
          ) : null}
        </Box>
        <Box runaComponent="preview-panel-actions" style={previewPanelHeaderActionsStyle}>
          <Button
            aria-label="Open preview file externally"
            disabled={externalOpenState.status === 'pending'}
            onClick={() => void handleOpenExternally()}
            runaComponent="preview-panel-open-external"
            style={previewPanelRefreshButtonStyle}
          >
            {externalOpenState.status === 'pending' ? 'Opening...' : 'Open file'}
          </Button>
          <Button
            aria-label="Open preview containing folder externally"
            disabled={externalOpenState.status === 'pending' || !containingFolderPath}
            onClick={() => void handleOpenContainingFolder()}
            runaComponent="preview-panel-open-containing-folder"
            style={previewPanelRefreshButtonStyle}
          >
            Folder
          </Button>
          <Button
            aria-label="Copy preview file path"
            disabled={pathCopyState.status === 'pending'}
            onClick={() => void handleCopyPath()}
            runaComponent="preview-panel-copy-path"
            style={previewPanelRefreshButtonStyle}
          >
            {pathCopyState.status === 'pending' ? 'Copying...' : 'Copy path'}
          </Button>
          <Button
            aria-label="Refresh preview"
            onClick={() => setRefreshNonce((value) => value + 1)}
            runaComponent="preview-panel-refresh"
            style={previewPanelRefreshButtonStyle}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      <ScrollArea runaComponent="preview-panel-body" style={previewPanelBodyStyle}>
        <Box runaComponent="preview-panel-body-inner" style={previewPanelBodyInnerStyle}>
          {state.status === 'loading' ? (
            <Text runaComponent="preview-panel-loading" style={previewPanelStateStyle}>
              Loading preview
            </Text>
          ) : null}
          {state.status === 'error' ? (
            <Text runaComponent="preview-panel-error" style={previewPanelStateStyle}>
              {state.errorMessage}
            </Text>
          ) : null}
          {state.status === 'ready' ? (
            previewTable ? (
              <>
                <Box runaComponent="preview-panel-table-wrap" style={previewPanelTableWrapStyle}>
                  <table data-runa-component="preview-panel-table" style={previewPanelTableStyle}>
                    <thead>
                      <tr>
                        {previewTable.columns.map((column, columnIndex) => (
                          <th
                            key={`${column}-${columnIndex}`}
                            scope="col"
                            style={previewPanelTableHeaderCellStyle}
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewTable.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, columnIndex) => (
                            <td key={`${rowIndex}-${columnIndex}`} style={previewPanelTableCellStyle}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
                {previewTableLimitLabel ? (
                  <Text runaComponent="preview-panel-table-limit" style={previewPanelStateStyle}>
                    {previewTableLimitLabel}
                  </Text>
                ) : null}
              </>
            ) : state.snapshot.content ? (
              <pre data-runa-component="preview-panel-content" style={previewPanelCodeStyle}>
                {state.snapshot.content}
              </pre>
            ) : (
              <Text runaComponent="preview-panel-empty" style={previewPanelStateStyle}>
                Preview is empty
              </Text>
            )
          ) : null}
        </Box>
      </ScrollArea>
    </Box>
  )
}
