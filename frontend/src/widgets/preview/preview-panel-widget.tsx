import { useEffect, useState } from 'react'

import { readPreviewFile, type PreviewFileSnapshot } from '@/features/preview/api/client'
import { Box, Button, ScrollArea, Text } from '@/shared/ui/primitives'
import {
  previewPanelBodyInnerStyle,
  previewPanelBodyStyle,
  previewPanelCodeStyle,
  previewPanelHeaderMetaStyle,
  previewPanelHeaderStyle,
  previewPanelMetaStyle,
  previewPanelRefreshButtonStyle,
  previewPanelRootStyle,
  previewPanelStateStyle,
  previewPanelTitleStyle,
} from './preview-panel-widget.styles'

export type PreviewPanelWidgetProps = {
  path: string
  title: string
}

type PreviewPanelLoadState =
  | { status: 'loading'; snapshot: null; errorMessage: null }
  | { status: 'ready'; snapshot: PreviewFileSnapshot; errorMessage: null }
  | { status: 'error'; snapshot: null; errorMessage: string }

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

export function PreviewPanelWidget({ path, title }: PreviewPanelWidgetProps) {
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [state, setState] = useState<PreviewPanelLoadState>({
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

    readPreviewFile(path, { maxBytes: 65_536 })
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
          errorMessage: error instanceof Error ? error.message : 'Unable to load preview',
          snapshot: null,
          status: 'error',
        })
      })

    return () => {
      isCancelled = true
    }
  }, [path, refreshNonce])

  const previewSummary =
    state.status === 'ready'
      ? `${getPreviewKindLabel(state.snapshot)} · ${formatBytes(state.snapshot.sizeBytes)}${
          state.snapshot.truncated ? ' · truncated' : ''
        }`
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
        </Box>
        <Button
          aria-label="Refresh preview"
          onClick={() => setRefreshNonce((value) => value + 1)}
          runaComponent="preview-panel-refresh"
          style={previewPanelRefreshButtonStyle}
        >
          Refresh
        </Button>
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
            state.snapshot.content ? (
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
