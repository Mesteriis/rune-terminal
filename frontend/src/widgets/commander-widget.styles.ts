import type { CSSProperties } from 'react'

export const commanderRootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  padding: 'var(--space-sm) var(--space-md)',
  minHeight: '40px',
  background: 'var(--color-canvas-elevated)',
}

export const commanderHeaderClusterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderModeButtonRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderModeButtonStyle: CSSProperties = {
  minHeight: '26px',
  minWidth: 'auto',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  border: '1px solid var(--runa-commander-surface-border)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderIconControlStyle: CSSProperties = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  padding: 0,
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  border: '1px solid var(--runa-commander-surface-border)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderIconControlDisabledStyle: CSSProperties = {
  opacity: 0.4,
}

export const commanderModeButtonActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
}

export const commanderToggleButtonStyle: CSSProperties = {
  minHeight: '26px',
  minWidth: 'auto',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  border: '1px solid var(--runa-commander-surface-border)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderToggleActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
  borderColor: 'var(--runa-commander-highlight-border)',
  background: 'var(--runa-commander-highlight-fill)',
}

export const commanderMainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPaneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  borderColor: 'var(--runa-commander-surface-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
}

export const commanderPaneActiveStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-highlight-border)',
  boxShadow: 'inset 0 0 0 1px var(--runa-commander-highlight-ring)',
}

export const commanderPaneHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '32px',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
  background: 'rgba(13, 21, 19, 0.96)',
}

export const commanderPaneHeaderActiveStyle: CSSProperties = {
  background: 'var(--runa-commander-highlight-fill-strong)',
}

export const commanderPaneTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  flex: 1,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderPathTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-strong)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderPaneMetaStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderListHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0, 1fr) 34px 72px 116px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  minHeight: '24px',
  padding: '0 var(--space-sm)',
  background: 'rgba(9, 16, 15, 0.96)',
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderScrollAreaStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: 0,
  background: 'rgba(5, 11, 10, 0.96)',
}

export const commanderRowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0, 1fr) 34px 72px 116px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  minHeight: '26px',
  padding: '0 var(--space-sm)',
  borderRadius: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
  boxShadow: 'none',
}

export const commanderRowSelectedStyle: CSSProperties = {
  background: 'var(--runa-commander-selection-fill)',
  color: 'var(--runa-commander-text-strong)',
}

export const commanderRowFocusedStyle: CSSProperties = {
  background: 'var(--runa-commander-highlight-fill)',
  color: 'var(--runa-commander-highlight-text)',
  boxShadow: 'inset 0 0 0 1px var(--runa-commander-highlight-border)',
}

export const commanderRowHiddenStyle: CSSProperties = {
  opacity: 0.58,
}

export const commanderRowNameCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const commanderRowSymlinkArrowStyle: CSSProperties = {
  flex: '0 0 auto',
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderRowSymlinkTargetStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderRowNameTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'inherit',
}

export const commanderRowMetaTextStyle: CSSProperties = {
  justifySelf: 'end',
  color: 'inherit',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderTypeBadgeStyle: CSSProperties = {
  minHeight: '18px',
  padding: '0 var(--space-xs)',
  borderRadius: 'var(--radius-xs)',
  borderColor: 'var(--runa-commander-surface-border)',
  background: 'rgba(255, 255, 255, 0.02)',
  color: 'var(--runa-commander-text-muted)',
  fontSize: '11px',
  lineHeight: '14px',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderPaneFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  background: 'rgba(13, 21, 19, 0.98)',
  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
}

export const commanderFooterTextStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

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
  background: 'rgba(9, 16, 15, 0.98)',
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
  borderColor: 'rgba(212, 180, 104, 0.42)',
  background: 'rgba(86, 67, 26, 0.22)',
  color: 'rgb(228, 211, 164)',
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
  background: 'rgba(9, 16, 15, 0.98)',
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
  border: '1px solid rgba(100, 138, 128, 0.14)',
  borderRadius: 'var(--radius-xs)',
  background: 'rgba(9, 16, 15, 0.82)',
}

export const commanderPendingPreviewConflictRowStyle: CSSProperties = {
  borderColor: 'rgba(212, 180, 104, 0.32)',
  background: 'rgba(68, 54, 24, 0.2)',
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
  border: '1px solid rgba(100, 138, 128, 0.18)',
  background: 'rgba(9, 16, 15, 0.82)',
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
