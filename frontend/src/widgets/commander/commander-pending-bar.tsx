import { useMemo, type RefObject } from 'react'

import type { CommanderWidgetViewState } from '@/features/commander/model/types'
import { Badge, Box, Input, ScrollArea, Surface, Text } from '@/shared/ui/primitives'

import { CommanderPlainBox } from '@/widgets/commander/commander-plain'
import {
  commanderRenameTemplatePresets,
  formatPendingOperationMessage,
  getCommanderPendingInputAriaLabel,
  getRenamePreviewStatusLabel,
  getRenamePreviewStatusStyle,
  getRenamePreviewSummary,
  isPendingOperationBlocking,
  isPendingOperationConflictResolution,
} from '@/widgets/commander/commander-widget.shared'
import {
  commanderHintActionStyle,
  commanderHintBarStyle,
  commanderHintCellStyle,
  commanderHintKeyStyle,
  commanderHintLabelStyle,
  commanderPendingActionStyle,
  commanderPendingBarStyle,
  commanderPendingBarWithConflictStyle,
  commanderPendingBarWithInputStyle,
  commanderPendingInputStyle,
  commanderPendingMessageStyle,
  commanderPendingPreviewConflictRowStyle,
  commanderPendingPreviewHeaderStyle,
  commanderPendingPreviewIndexStyle,
  commanderPendingPreviewListStyle,
  commanderPendingPreviewRowStyle,
  commanderPendingPreviewScrollStyle,
  commanderPendingPreviewTargetTextStyle,
  commanderPendingPreviewTextStyle,
  commanderPendingRenameHelpStyle,
  commanderPendingRenamePresetRowStyle,
  commanderPendingRenamePresetStyle,
  commanderPendingRenameSummaryStyle,
  commanderPendingSupplementStyle,
  commanderPendingWarningStyle,
  commanderTypeBadgeStyle,
} from '@/widgets/commander/commander-widget.styles'

type CommanderPendingActions = {
  cancelPendingOperation: () => void
  confirmPendingOperation: () => void
  overwritePendingConflict: () => void
  skipPendingConflict: () => void
  overwriteAllPendingConflicts: () => void
  skipAllPendingConflicts: () => void
  setPendingOperationInput: (inputValue: string) => void
}

type CommanderPendingBarProps = {
  state: CommanderWidgetViewState
  commanderActions: CommanderPendingActions
  pendingInputRef: RefObject<HTMLInputElement | null>
  onFocusRoot: () => void
  onHintAction: (hintKey: string) => void
}

export function CommanderPendingBar({
  state,
  commanderActions,
  pendingInputRef,
  onFocusRoot,
  onHintAction,
}: CommanderPendingBarProps) {
  const pendingOperationMessage = formatPendingOperationMessage(state)
  const pendingOperationNeedsInput = (
    state.pendingOperation?.kind === 'rename'
    || state.pendingOperation?.kind === 'select'
    || state.pendingOperation?.kind === 'unselect'
    || state.pendingOperation?.kind === 'filter'
    || state.pendingOperation?.kind === 'search'
  )
  const pendingOperationIsBlocking = isPendingOperationBlocking(state)
  const pendingOperationNeedsConflictResolution = isPendingOperationConflictResolution(state)
  const pendingRenamePreview = state.pendingOperation?.kind === 'rename'
    ? (state.pendingOperation.renamePreview ?? [])
    : []
  const pendingMaskPreview = (
    state.pendingOperation?.kind === 'select'
    || state.pendingOperation?.kind === 'unselect'
    || state.pendingOperation?.kind === 'filter'
    || state.pendingOperation?.kind === 'search'
  )
    ? (state.pendingOperation.matchPreview ?? [])
    : []
  const pendingSearchMatchPosition = state.pendingOperation?.kind === 'search'
    && (state.pendingOperation.matchCount ?? 0) > 0
    && typeof state.pendingOperation.matchIndex === 'number'
    ? `${state.pendingOperation.matchIndex + 1}/${state.pendingOperation.matchCount}`
    : null
  const pendingRenamePreviewSummary = useMemo(
    () => getRenamePreviewSummary(pendingRenamePreview),
    [pendingRenamePreview],
  )

  if (!state.pendingOperation || !pendingOperationMessage) {
    return (
      <Surface runaComponent="commander-hint-bar" style={commanderHintBarStyle}>
        {state.footerHints.map((hint) => {
          const hintComponentKey = hint.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')

          return (
            <CommanderPlainBox
              key={hint.key}
              onClick={() => onHintAction(hint.key)}
              role="button"
              runaComponent={`commander-hint-${hintComponentKey}`}
              style={{
                ...commanderHintCellStyle,
                ...commanderHintActionStyle,
              }}
              tabIndex={-1}
            >
              <Text runaComponent={`commander-hint-${hintComponentKey}-key`} style={commanderHintKeyStyle}>
                {hint.key}
              </Text>
              <Text runaComponent={`commander-hint-${hintComponentKey}-label`} style={commanderHintLabelStyle}>
                {hint.label}
              </Text>
            </CommanderPlainBox>
          )
        })}
      </Surface>
    )
  }

  return (
    <Surface
      runaComponent="commander-pending-bar"
      style={{
        ...commanderPendingBarStyle,
        ...(pendingOperationNeedsInput ? commanderPendingBarWithInputStyle : null),
        ...(pendingOperationNeedsConflictResolution ? commanderPendingBarWithConflictStyle : null),
      }}
    >
      <Box runaComponent="commander-pending-message" style={commanderPendingMessageStyle}>
        <Text runaComponent="commander-pending-message-text" style={{ color: 'inherit' }}>
          {pendingOperationMessage}
        </Text>
      </Box>
      {pendingOperationNeedsInput ? (
        <Input
          aria-label={getCommanderPendingInputAriaLabel(state.pendingOperation)}
          onChange={(event) => commanderActions.setPendingOperationInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.stopPropagation()
              if (pendingOperationIsBlocking) {
                return
              }

              commanderActions.confirmPendingOperation()
              return
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              commanderActions.cancelPendingOperation()
              onFocusRoot()
            }
          }}
          ref={pendingInputRef}
          runaComponent="commander-pending-input"
          style={commanderPendingInputStyle}
          value={state.pendingOperation.inputValue ?? ''}
        />
      ) : null}
      {pendingOperationNeedsConflictResolution ? (
        <>
          <CommanderPlainBox
            onClick={() => {
              commanderActions.overwritePendingConflict()
              onFocusRoot()
            }}
            role="button"
            runaComponent="commander-pending-overwrite"
            style={{
              ...commanderHintCellStyle,
              ...commanderPendingActionStyle,
            }}
            tabIndex={-1}
          >
            <Text runaComponent="commander-pending-overwrite-key" style={commanderHintKeyStyle}>ENTER</Text>
            <Text runaComponent="commander-pending-overwrite-label" style={commanderHintLabelStyle}>Overwrite</Text>
          </CommanderPlainBox>
          <CommanderPlainBox
            onClick={() => {
              commanderActions.skipPendingConflict()
              onFocusRoot()
            }}
            role="button"
            runaComponent="commander-pending-skip"
            style={{
              ...commanderHintCellStyle,
              ...commanderPendingActionStyle,
            }}
            tabIndex={-1}
          >
            <Text runaComponent="commander-pending-skip-key" style={commanderHintKeyStyle}>SPACE</Text>
            <Text runaComponent="commander-pending-skip-label" style={commanderHintLabelStyle}>Skip</Text>
          </CommanderPlainBox>
          <CommanderPlainBox
            onClick={() => {
              commanderActions.overwriteAllPendingConflicts()
              onFocusRoot()
            }}
            role="button"
            runaComponent="commander-pending-overwrite-all"
            style={{
              ...commanderHintCellStyle,
              ...commanderPendingActionStyle,
            }}
            tabIndex={-1}
          >
            <Text runaComponent="commander-pending-overwrite-all-key" style={commanderHintKeyStyle}>SHIFT+ENTER</Text>
            <Text runaComponent="commander-pending-overwrite-all-label" style={commanderHintLabelStyle}>Overwrite all</Text>
          </CommanderPlainBox>
          <CommanderPlainBox
            onClick={() => {
              commanderActions.skipAllPendingConflicts()
              onFocusRoot()
            }}
            role="button"
            runaComponent="commander-pending-skip-all"
            style={{
              ...commanderHintCellStyle,
              ...commanderPendingActionStyle,
            }}
            tabIndex={-1}
          >
            <Text runaComponent="commander-pending-skip-all-key" style={commanderHintKeyStyle}>SHIFT+SPACE</Text>
            <Text runaComponent="commander-pending-skip-all-label" style={commanderHintLabelStyle}>Skip all</Text>
          </CommanderPlainBox>
        </>
      ) : (
        <CommanderPlainBox
          onClick={() => {
            if (pendingOperationIsBlocking) {
              return
            }

            commanderActions.confirmPendingOperation()
            if (!pendingOperationNeedsInput) {
              onFocusRoot()
            }
          }}
          role="button"
          runaComponent="commander-pending-confirm"
          style={{
            ...commanderHintCellStyle,
            ...commanderPendingActionStyle,
          }}
          tabIndex={-1}
        >
          <Text runaComponent="commander-pending-confirm-key" style={commanderHintKeyStyle}>ENTER</Text>
          <Text runaComponent="commander-pending-confirm-label" style={commanderHintLabelStyle}>
            {pendingOperationIsBlocking ? 'Fix template' : 'Confirm'}
          </Text>
        </CommanderPlainBox>
      )}
      <CommanderPlainBox
        onClick={() => {
          commanderActions.cancelPendingOperation()
          onFocusRoot()
        }}
        role="button"
        runaComponent="commander-pending-cancel"
        style={{
          ...commanderHintCellStyle,
          ...commanderPendingActionStyle,
        }}
        tabIndex={-1}
      >
        <Text runaComponent="commander-pending-cancel-key" style={commanderHintKeyStyle}>ESC</Text>
        <Text runaComponent="commander-pending-cancel-label" style={commanderHintLabelStyle}>Cancel</Text>
      </CommanderPlainBox>
      {pendingOperationNeedsInput ? (
        <Box runaComponent="commander-pending-rename-supplement" style={commanderPendingSupplementStyle}>
          {state.pendingOperation.kind === 'rename' ? (
            <>
              <Box runaComponent="commander-pending-rename-help" style={commanderPendingRenameHelpStyle}>
                <Text runaComponent="commander-pending-rename-help-name" style={{ color: 'inherit' }}>[N] name</Text>
                <Text runaComponent="commander-pending-rename-help-name-lower" style={{ color: 'inherit' }}>[N:l] lower</Text>
                <Text runaComponent="commander-pending-rename-help-name-upper" style={{ color: 'inherit' }}>[N:u] upper</Text>
                <Text runaComponent="commander-pending-rename-help-ext" style={{ color: 'inherit' }}>[E] ext</Text>
                <Text runaComponent="commander-pending-rename-help-ext-lower" style={{ color: 'inherit' }}>[E:l] lower ext</Text>
                <Text runaComponent="commander-pending-rename-help-full" style={{ color: 'inherit' }}>[F] full</Text>
                <Text runaComponent="commander-pending-rename-help-full-upper" style={{ color: 'inherit' }}>[F:u] upper full</Text>
                <Text runaComponent="commander-pending-rename-help-counter" style={{ color: 'inherit' }}>[C] counter</Text>
                <Text runaComponent="commander-pending-rename-help-counter-width" style={{ color: 'inherit' }}>[C:2] padded counter</Text>
                <Text runaComponent="commander-pending-rename-help-counter-start" style={{ color: 'inherit' }}>[C:10:3] start 10 width 3</Text>
                <Text runaComponent="commander-pending-rename-help-counter-step" style={{ color: 'inherit' }}>[C:10:3:2] step 2</Text>
              </Box>
              {state.pendingOperation.renameMode === 'batch' ? (
                <Box runaComponent="commander-pending-rename-preset-row" style={commanderPendingRenamePresetRowStyle}>
                  {commanderRenameTemplatePresets.map((template) => (
                    <Badge
                      key={template}
                      onClick={() => commanderActions.setPendingOperationInput(template)}
                      runaComponent={`commander-pending-rename-preset-${template.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      style={commanderPendingRenamePresetStyle}
                    >
                      {template}
                    </Badge>
                  ))}
                </Box>
              ) : null}
              {pendingRenamePreview.length > 0 ? (
                <Box runaComponent="commander-pending-rename-summary" style={commanderPendingRenameSummaryStyle}>
                  <Badge runaComponent="commander-pending-rename-summary-total" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                    {pendingRenamePreviewSummary.total} total
                  </Badge>
                  <Badge runaComponent="commander-pending-rename-summary-ok" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                    {pendingRenamePreviewSummary.ok} ok
                  </Badge>
                  {pendingRenamePreviewSummary.conflict ? (
                    <Badge runaComponent="commander-pending-rename-summary-conflict" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('conflict') }}>
                      {pendingRenamePreviewSummary.conflict} exists
                    </Badge>
                  ) : null}
                  {pendingRenamePreviewSummary.duplicate ? (
                    <Badge runaComponent="commander-pending-rename-summary-duplicate" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('duplicate') }}>
                      {pendingRenamePreviewSummary.duplicate} duplicate
                    </Badge>
                  ) : null}
                  {pendingRenamePreviewSummary.invalid ? (
                    <Badge runaComponent="commander-pending-rename-summary-invalid" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('invalid') }}>
                      {pendingRenamePreviewSummary.invalid} invalid
                    </Badge>
                  ) : null}
                </Box>
              ) : null}
              {state.pendingOperation.duplicateTargetNames?.length ? (
                <Box runaComponent="commander-pending-rename-duplicate-warning" style={commanderPendingWarningStyle}>
                  <Text runaComponent="commander-pending-rename-duplicate-warning-text" style={{ color: 'inherit' }}>
                    Duplicate targets: {state.pendingOperation.duplicateTargetNames.join(', ')}
                  </Text>
                </Box>
              ) : null}
              {pendingRenamePreview.length > 0 ? (
                <Box runaComponent="commander-pending-rename-preview-table" style={commanderPendingPreviewListStyle}>
                  <Box runaComponent="commander-pending-rename-preview-header" style={commanderPendingPreviewHeaderStyle}>
                    <Text runaComponent="commander-pending-rename-preview-header-index" style={commanderPendingPreviewIndexStyle}>#</Text>
                    <Text runaComponent="commander-pending-rename-preview-header-current" style={commanderPendingPreviewTextStyle}>Current</Text>
                    <Text runaComponent="commander-pending-rename-preview-header-next" style={commanderPendingPreviewTextStyle}>Next</Text>
                    <Text runaComponent="commander-pending-rename-preview-header-status" style={commanderPendingPreviewTextStyle}>Status</Text>
                  </Box>
                  <ScrollArea runaComponent="commander-pending-rename-preview-scroll" style={commanderPendingPreviewScrollStyle}>
                    <Box runaComponent="commander-pending-rename-preview-list" style={commanderPendingPreviewListStyle}>
                      {pendingRenamePreview.map((previewItem, index) => (
                        <Box
                          key={previewItem.entryId}
                          runaComponent={`commander-pending-rename-preview-${index + 1}`}
                          style={{
                            ...commanderPendingPreviewRowStyle,
                            ...(previewItem.conflict ? commanderPendingPreviewConflictRowStyle : null),
                          }}
                        >
                          <Text runaComponent={`commander-pending-rename-preview-${index + 1}-index`} style={commanderPendingPreviewIndexStyle}>
                            {index + 1}
                          </Text>
                          <Text runaComponent={`commander-pending-rename-preview-${index + 1}-current`} style={commanderPendingPreviewTextStyle}>
                            {previewItem.currentName}
                          </Text>
                          <Text runaComponent={`commander-pending-rename-preview-${index + 1}-next`} style={commanderPendingPreviewTargetTextStyle}>
                            {previewItem.nextName || 'Invalid name'}
                          </Text>
                          <Badge
                            runaComponent={`commander-pending-rename-preview-${index + 1}-status`}
                            style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle(previewItem.status) }}
                          >
                            {getRenamePreviewStatusLabel(previewItem.status)}
                          </Badge>
                        </Box>
                      ))}
                    </Box>
                  </ScrollArea>
                </Box>
              ) : null}
            </>
          ) : null}
          {(state.pendingOperation.kind === 'select'
            || state.pendingOperation.kind === 'unselect'
            || state.pendingOperation.kind === 'filter'
            || state.pendingOperation.kind === 'search') ? (
            <>
              <Box runaComponent="commander-pending-mask-help" style={commanderPendingRenameHelpStyle}>
                {state.pendingOperation.kind === 'search' ? (
                  <>
                    <Text runaComponent="commander-pending-search-help-substring" style={{ color: 'inherit' }}>substring match</Text>
                    <Text runaComponent="commander-pending-search-help-visible" style={{ color: 'inherit' }}>visible rows only</Text>
                    <Text runaComponent="commander-pending-search-help-arrows" style={{ color: 'inherit' }}>up/down step hits</Text>
                    <Text runaComponent="commander-pending-search-help-enter" style={{ color: 'inherit' }}>enter confirms current</Text>
                  </>
                ) : (
                  <>
                    <Text runaComponent="commander-pending-mask-help-wildcard" style={{ color: 'inherit' }}>* any</Text>
                    <Text runaComponent="commander-pending-mask-help-single" style={{ color: 'inherit' }}>? single</Text>
                    <Text runaComponent="commander-pending-mask-help-split" style={{ color: 'inherit' }}>; split masks</Text>
                  </>
                )}
                {state.pendingOperation.kind === 'filter' ? (
                  <Text runaComponent="commander-pending-mask-help-empty" style={{ color: 'inherit' }}>empty clears filter</Text>
                ) : null}
              </Box>
              <Box runaComponent="commander-pending-mask-summary" style={commanderPendingRenameSummaryStyle}>
                <Badge runaComponent="commander-pending-mask-summary-count" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                  {state.pendingOperation.matchCount ?? 0} matches
                </Badge>
                {state.pendingOperation.kind === 'search' && pendingSearchMatchPosition ? (
                  <Badge runaComponent="commander-pending-search-summary-position" style={{ ...commanderTypeBadgeStyle, ...getRenamePreviewStatusStyle('ok') }}>
                    {pendingSearchMatchPosition}
                  </Badge>
                ) : null}
                {pendingMaskPreview.map((entryName, index) => (
                  <Text key={`${entryName}-${index}`} runaComponent={`commander-pending-mask-preview-${index + 1}`} style={commanderPendingPreviewTextStyle}>
                    {entryName}
                  </Text>
                ))}
                {(state.pendingOperation.matchCount ?? 0) > pendingMaskPreview.length ? (
                  <Text runaComponent="commander-pending-mask-preview-more" style={commanderPendingPreviewTextStyle}>
                    +{(state.pendingOperation.matchCount ?? 0) - pendingMaskPreview.length} more
                  </Text>
                ) : null}
              </Box>
            </>
          ) : null}
        </Box>
      ) : null}
    </Surface>
  )
}
