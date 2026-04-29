import type { CSSProperties } from 'react'

export const commanderHintBarStyle: CSSProperties = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(0, 1fr)',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-xs)',
  background: 'var(--color-canvas-elevated)',
}

export const commanderHintCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--runa-commander-surface-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-control-bg)',
}

export const commanderHintActionStyle: CSSProperties = {
  width: '100%',
  justifyContent: 'flex-start',
  cursor: 'pointer',
}

export const commanderPendingBarStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-xs)',
  background: 'var(--color-canvas-elevated)',
}

export const commanderPendingBarWithInputStyle: CSSProperties = {
  gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
}

export const commanderPendingBarWithConflictStyle: CSSProperties = {
  gridTemplateColumns: 'minmax(0, 1fr) repeat(5, auto)',
}

export const commanderPendingSupplementStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPendingMessageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--runa-commander-highlight-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-highlight-fill)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const commanderPendingWarningStyle: CSSProperties = {
  ...commanderPendingMessageStyle,
  borderColor: 'var(--runa-commander-warning-border)',
  background: 'var(--runa-commander-warning-bg)',
  color: 'var(--runa-commander-warning-text)',
}

export const commanderPendingActionStyle: CSSProperties = {
  minWidth: 'unset',
  justifyContent: 'flex-start',
}

export const commanderPendingInputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-control-bg)',
  color: 'var(--runa-commander-highlight-text)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderPendingPreviewListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPendingPreviewScrollStyle: CSSProperties = {
  maxHeight: '168px',
  minHeight: 0,
  padding: 0,
  background: 'transparent',
}

export const commanderPendingPreviewHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px minmax(0, 1fr) minmax(0, 1fr) auto',
  gap: 'var(--gap-xs)',
  alignItems: 'center',
  minHeight: '22px',
  padding: '0 var(--space-sm)',
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
}

export const commanderPendingPreviewRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px minmax(0, 1fr) minmax(0, 1fr) auto',
  gap: 'var(--gap-xs)',
  alignItems: 'center',
  minHeight: '22px',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--runa-commander-preview-row-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-preview-row-bg)',
}

export const commanderPendingPreviewConflictRowStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-preview-conflict-border)',
  background: 'var(--runa-commander-preview-conflict-bg)',
}

export const commanderPendingPreviewArrowStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
}

export const commanderPendingPreviewIndexStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
}

export const commanderPendingPreviewTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
}

export const commanderPendingPreviewTargetTextStyle: CSSProperties = {
  ...commanderPendingPreviewTextStyle,
  color: 'var(--runa-commander-highlight-text)',
}

export const commanderPendingRenameHelpStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gap-sm)',
  padding: '0 var(--space-sm)',
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
}

export const commanderPendingRenamePresetRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gap-xs)',
  padding: '0 var(--space-sm)',
}

export const commanderPendingRenamePresetStyle: CSSProperties = {
  minHeight: '22px',
  padding: '0 var(--space-xs)',
  borderRadius: 'var(--radius-xs)',
  border: '1px solid var(--runa-commander-rename-preset-border)',
  background: 'var(--runa-commander-rename-preset-bg)',
  color: 'var(--runa-commander-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  cursor: 'pointer',
  boxShadow: 'none',
}

export const commanderPendingRenameSummaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gap-xs)',
  padding: '0 var(--space-sm)',
}

export const commanderHintKeyStyle: CSSProperties = {
  color: 'var(--runa-commander-key-color)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderHintLabelStyle: CSSProperties = {
  color: 'var(--runa-commander-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}
