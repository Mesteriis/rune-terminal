import { useCallback, useEffect, useRef, useState } from 'react'

import type { CommanderFileDialogMode, CommanderFilePreviewKind } from '@/features/commander/model/types'
import { Badge, Box, Button, Surface, Text, TextArea } from '@/shared/ui/primitives'

import {
  commanderPaneStateBadgeStyle,
  getCommanderCursorMetrics,
} from '@/widgets/commander/commander-widget.shared'
import {
  commanderFileDialogActionsStyle,
  commanderFileDialogBlockedBodyStyle,
  commanderFileDialogBlockedReasonStyle,
  commanderFileDialogBlockedTitleStyle,
  commanderFileDialogClosePromptStyle,
  commanderFileDialogFooterStyle,
  commanderFileDialogHeaderStyle,
  commanderFileDialogHintStyle,
  commanderFileDialogMetaStyle,
  commanderFileDialogOverlayStyle,
  commanderFileDialogPathStyle,
  commanderFileDialogStyle,
  commanderFileDialogTextAreaStyle,
  commanderFileDialogTitleClusterStyle,
  commanderFileDialogTitleRowStyle,
  commanderFileDialogTitleStyle,
  commanderTypeBadgeStyle,
} from '@/widgets/commander/commander-widget.styles'

export type CommanderFileDialogProps = {
  blockedReason?: string
  blockedTitle?: string
  blockedHint?: string
  dirty: boolean
  content: string
  entryName: string
  entryPath: string
  mode: CommanderFileDialogMode
  onOpenExternal?: () => Promise<void> | void
  previewKind?: CommanderFilePreviewKind
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

/** Renders the backend-backed file viewer/editor modal for the focused commander file. */
export function CommanderFileDialog({
  blockedReason,
  blockedTitle,
  blockedHint,
  dirty,
  content,
  entryName,
  entryPath,
  mode,
  onOpenExternal,
  previewKind,
  onChange,
  onClose,
  onSave,
}: CommanderFileDialogProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const dialogIdentityRef = useRef<string | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const [cursorMetrics, setCursorMetrics] = useState(() => getCommanderCursorMetrics(content, 0))
  const [externalOpenError, setExternalOpenError] = useState<string | null>(null)
  const [externalOpenSuccess, setExternalOpenSuccess] = useState<string | null>(null)
  const [externalOpenPending, setExternalOpenPending] = useState(false)
  const isEditable = mode === 'edit'
  const isBlocked = mode === 'blocked'
  const isHexPreview = !isEditable && !isBlocked && previewKind === 'hex'

  const syncCursorMetrics = useCallback(() => {
    const nextPosition = textAreaRef.current?.selectionStart ?? 0
    setCursorMetrics(getCommanderCursorMetrics(content, nextPosition))
  }, [content])

  const requestClose = useCallback(() => {
    if (isEditable && dirty) {
      setShowDiscardPrompt(true)
      return
    }

    setShowDiscardPrompt(false)
    onClose()
  }, [dirty, isEditable, onClose])

  useEffect(() => {
    const nextIdentity = `${entryPath}:${mode}`

    if (dialogIdentityRef.current === nextIdentity) {
      return
    }

    dialogIdentityRef.current = nextIdentity
    setShowDiscardPrompt(false)
    setExternalOpenError(null)
    setExternalOpenSuccess(null)
    setExternalOpenPending(false)

    if (!textAreaRef.current) {
      return
    }

    textAreaRef.current.focus()

    if (isEditable) {
      const cursorPosition = textAreaRef.current.value.length
      textAreaRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }

    syncCursorMetrics()
  }, [entryPath, isEditable, mode, syncCursorMetrics])

  useEffect(() => {
    syncCursorMetrics()
  }, [content, syncCursorMetrics])

  const handleOpenExternal = useCallback(async () => {
    if (!onOpenExternal || externalOpenPending) {
      return
    }

    try {
      setExternalOpenPending(true)
      setExternalOpenError(null)
      setExternalOpenSuccess(null)
      await onOpenExternal()
      setExternalOpenSuccess('Open request sent to the system opener.')
    } catch (error) {
      setExternalOpenSuccess(null)
      setExternalOpenError(error instanceof Error ? error.message : 'Unable to open file externally.')
    } finally {
      setExternalOpenPending(false)
    }
  }, [externalOpenPending, onOpenExternal])

  return (
    <Box
      onMouseDown={requestClose}
      runaComponent="commander-file-dialog-overlay"
      style={commanderFileDialogOverlayStyle}
    >
      <Surface
        onMouseDown={(event) => event.stopPropagation()}
        runaComponent="commander-file-dialog"
        style={commanderFileDialogStyle}
      >
        <Box runaComponent="commander-file-dialog-header" style={commanderFileDialogHeaderStyle}>
          <Box
            runaComponent="commander-file-dialog-title-cluster"
            style={commanderFileDialogTitleClusterStyle}
          >
            <Box runaComponent="commander-file-dialog-title-row" style={commanderFileDialogTitleRowStyle}>
              <Badge runaComponent="commander-file-dialog-mode" style={commanderPaneStateBadgeStyle}>
                {isEditable ? 'EDIT' : isBlocked ? 'BLOCKED' : 'VIEW'}
              </Badge>
              <Text runaComponent="commander-file-dialog-title" style={commanderFileDialogTitleStyle}>
                {entryName}
              </Text>
              {isHexPreview ? (
                <Badge runaComponent="commander-file-dialog-preview-kind" style={commanderTypeBadgeStyle}>
                  HEX
                </Badge>
              ) : null}
              {isEditable && dirty ? (
                <Badge runaComponent="commander-file-dialog-dirty" style={commanderTypeBadgeStyle}>
                  DIRTY
                </Badge>
              ) : null}
            </Box>
            <Text runaComponent="commander-file-dialog-path" style={commanderFileDialogPathStyle}>
              {entryPath}
            </Text>
          </Box>
          <Box runaComponent="commander-file-dialog-actions" style={commanderFileDialogActionsStyle}>
            {isBlocked || isHexPreview ? (
              <Button
                disabled={!onOpenExternal || externalOpenPending}
                onClick={() => {
                  void handleOpenExternal()
                }}
                runaComponent="commander-file-dialog-open-external"
              >
                {externalOpenPending ? 'Opening…' : 'Open externally'}
              </Button>
            ) : null}
            {isEditable ? (
              <Button
                onClick={() => {
                  setShowDiscardPrompt(false)
                  onSave()
                }}
                runaComponent="commander-file-dialog-save"
              >
                Save
              </Button>
            ) : null}
            <Button onClick={requestClose} runaComponent="commander-file-dialog-close">
              Close
            </Button>
          </Box>
        </Box>
        {isBlocked ? (
          <Box runaComponent="commander-file-dialog-blocked-body" style={commanderFileDialogBlockedBodyStyle}>
            <Text
              runaComponent="commander-file-dialog-blocked-title"
              style={commanderFileDialogBlockedTitleStyle}
            >
              {blockedTitle ?? 'Edit unavailable for this file'}
            </Text>
            <Text
              runaComponent="commander-file-dialog-blocked-reason"
              style={commanderFileDialogBlockedReasonStyle}
            >
              {blockedReason ??
                'File is not UTF-8 text. Use `F3` for preview or open it with an external tool.'}
            </Text>
            {externalOpenError ? (
              <Text
                runaComponent="commander-file-dialog-open-external-error"
                style={commanderFileDialogBlockedReasonStyle}
              >
                {externalOpenError}
              </Text>
            ) : null}
            {externalOpenSuccess ? (
              <Text
                runaComponent="commander-file-dialog-open-external-success"
                style={commanderFileDialogBlockedReasonStyle}
              >
                {externalOpenSuccess}
              </Text>
            ) : null}
          </Box>
        ) : (
          <TextArea
            aria-label={isEditable ? `Edit ${entryName}` : `View ${entryName}`}
            onChange={(event) => onChange(event.target.value)}
            onClick={syncCursorMetrics}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                requestClose()
                return
              }

              if (
                isEditable &&
                (event.ctrlKey || event.metaKey) &&
                (event.key === 's' || event.key === 'S')
              ) {
                event.preventDefault()
                event.stopPropagation()
                setShowDiscardPrompt(false)
                onSave()
              }
            }}
            onKeyUp={syncCursorMetrics}
            onSelect={syncCursorMetrics}
            readOnly={!isEditable}
            ref={textAreaRef}
            runaComponent="commander-file-dialog-textarea"
            spellCheck={false}
            style={commanderFileDialogTextAreaStyle}
            value={content}
          />
        )}
        <Box runaComponent="commander-file-dialog-footer" style={commanderFileDialogFooterStyle}>
          <Box runaComponent="commander-file-dialog-meta" style={commanderFileDialogMetaStyle}>
            <Text runaComponent="commander-file-dialog-hint-mode" style={commanderFileDialogHintStyle}>
              {isEditable
                ? 'Ctrl+S save'
                : isBlocked
                  ? (blockedHint ?? 'Edit unavailable')
                  : isHexPreview
                    ? 'Read only hex preview'
                    : 'Read only preview'}
            </Text>
            {!isBlocked ? (
              <>
                <Text runaComponent="commander-file-dialog-cursor" style={commanderFileDialogHintStyle}>
                  Ln {cursorMetrics.line}, Col {cursorMetrics.column}
                </Text>
                <Text runaComponent="commander-file-dialog-size" style={commanderFileDialogHintStyle}>
                  {cursorMetrics.chars} chars
                </Text>
              </>
            ) : null}
            {externalOpenError ? (
              <Text
                runaComponent="commander-file-dialog-open-external-footer-error"
                style={commanderFileDialogHintStyle}
              >
                {externalOpenError}
              </Text>
            ) : null}
            {externalOpenSuccess ? (
              <Text
                runaComponent="commander-file-dialog-open-external-footer-success"
                style={commanderFileDialogHintStyle}
              >
                {externalOpenSuccess}
              </Text>
            ) : null}
          </Box>
          {showDiscardPrompt ? (
            <Box
              runaComponent="commander-file-dialog-close-prompt"
              style={commanderFileDialogClosePromptStyle}
            >
              <Text runaComponent="commander-file-dialog-close-warning" style={commanderFileDialogHintStyle}>
                Discard unsaved changes?
              </Text>
              <Button
                onClick={() => setShowDiscardPrompt(false)}
                runaComponent="commander-file-dialog-keep-editing"
              >
                Keep editing
              </Button>
              {isEditable ? (
                <Button
                  onClick={() => {
                    setShowDiscardPrompt(false)
                    onSave()
                  }}
                  runaComponent="commander-file-dialog-save-and-close"
                >
                  Save
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  setShowDiscardPrompt(false)
                  onClose()
                }}
                runaComponent="commander-file-dialog-discard"
              >
                Discard
              </Button>
            </Box>
          ) : (
            <Text runaComponent="commander-file-dialog-hint-close" style={commanderFileDialogHintStyle}>
              Esc close
            </Text>
          )}
        </Box>
      </Surface>
    </Box>
  )
}
