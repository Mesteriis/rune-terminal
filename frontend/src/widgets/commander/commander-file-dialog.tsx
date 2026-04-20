import { useCallback, useEffect, useRef, useState } from 'react'

import type { CommanderFileDialogMode } from '@/features/commander/model/types'
import { Badge, Box, Button, Surface, Text, TextArea } from '@/shared/ui/primitives'

import {
  commanderPaneStateBadgeStyle,
  getCommanderCursorMetrics,
} from '@/widgets/commander/commander-widget.shared'
import {
  commanderFileDialogActionsStyle,
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
  dirty: boolean
  content: string
  entryName: string
  entryPath: string
  mode: CommanderFileDialogMode
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export function CommanderFileDialog({
  dirty,
  content,
  entryName,
  entryPath,
  mode,
  onChange,
  onClose,
  onSave,
}: CommanderFileDialogProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const dialogIdentityRef = useRef<string | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const [cursorMetrics, setCursorMetrics] = useState(() => getCommanderCursorMetrics(content, 0))

  const syncCursorMetrics = useCallback(() => {
    const nextPosition = textAreaRef.current?.selectionStart ?? 0
    setCursorMetrics(getCommanderCursorMetrics(content, nextPosition))
  }, [content])

  const requestClose = useCallback(() => {
    if (mode === 'edit' && dirty) {
      setShowDiscardPrompt(true)
      return
    }

    setShowDiscardPrompt(false)
    onClose()
  }, [dirty, mode, onClose])

  useEffect(() => {
    const nextIdentity = `${entryPath}:${mode}`

    if (dialogIdentityRef.current === nextIdentity) {
      return
    }

    dialogIdentityRef.current = nextIdentity
    setShowDiscardPrompt(false)

    if (!textAreaRef.current) {
      return
    }

    textAreaRef.current.focus()

    if (mode === 'edit') {
      const cursorPosition = textAreaRef.current.value.length
      textAreaRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }

    syncCursorMetrics()
  }, [entryPath, mode, syncCursorMetrics])

  useEffect(() => {
    syncCursorMetrics()
  }, [content, syncCursorMetrics])

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
          <Box runaComponent="commander-file-dialog-title-cluster" style={commanderFileDialogTitleClusterStyle}>
            <Box runaComponent="commander-file-dialog-title-row" style={commanderFileDialogTitleRowStyle}>
              <Badge runaComponent="commander-file-dialog-mode" style={commanderPaneStateBadgeStyle}>
                {mode === 'edit' ? 'EDIT' : 'VIEW'}
              </Badge>
              <Text runaComponent="commander-file-dialog-title" style={commanderFileDialogTitleStyle}>
                {entryName}
              </Text>
              {mode === 'edit' && dirty ? (
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
            {mode === 'edit' ? (
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
            <Button
              onClick={requestClose}
              runaComponent="commander-file-dialog-close"
            >
              Close
            </Button>
          </Box>
        </Box>
        <TextArea
          aria-label={mode === 'edit' ? `Edit ${entryName}` : `View ${entryName}`}
          onChange={(event) => onChange(event.target.value)}
          onClick={syncCursorMetrics}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              requestClose()
              return
            }

            if (mode === 'edit' && (event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
              event.preventDefault()
              event.stopPropagation()
              setShowDiscardPrompt(false)
              onSave()
            }
          }}
          onKeyUp={syncCursorMetrics}
          onSelect={syncCursorMetrics}
          readOnly={mode === 'view'}
          ref={textAreaRef}
          runaComponent="commander-file-dialog-textarea"
          spellCheck={false}
          style={commanderFileDialogTextAreaStyle}
          value={content}
        />
        <Box runaComponent="commander-file-dialog-footer" style={commanderFileDialogFooterStyle}>
          <Box runaComponent="commander-file-dialog-meta" style={commanderFileDialogMetaStyle}>
            <Text runaComponent="commander-file-dialog-hint-mode" style={commanderFileDialogHintStyle}>
              {mode === 'edit' ? 'Ctrl+S save' : 'Read only preview'}
            </Text>
            <Text runaComponent="commander-file-dialog-cursor" style={commanderFileDialogHintStyle}>
              Ln {cursorMetrics.line}, Col {cursorMetrics.column}
            </Text>
            <Text runaComponent="commander-file-dialog-size" style={commanderFileDialogHintStyle}>
              {cursorMetrics.chars} chars
            </Text>
          </Box>
          {showDiscardPrompt ? (
            <Box runaComponent="commander-file-dialog-close-prompt" style={commanderFileDialogClosePromptStyle}>
              <Text runaComponent="commander-file-dialog-close-warning" style={commanderFileDialogHintStyle}>
                Discard unsaved changes?
              </Text>
              <Button
                onClick={() => setShowDiscardPrompt(false)}
                runaComponent="commander-file-dialog-keep-editing"
              >
                Keep editing
              </Button>
              {mode === 'edit' ? (
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
