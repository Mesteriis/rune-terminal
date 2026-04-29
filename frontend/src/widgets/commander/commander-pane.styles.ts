import type { CSSProperties } from 'react'

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
  background: 'var(--runa-commander-pane-header-bg)',
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

export const commanderPathFieldStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
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

export const commanderPathSuggestionsStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  maxHeight: '176px',
  overflow: 'hidden',
  border: '1px solid var(--runa-commander-highlight-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-popover-bg)',
  boxShadow: 'var(--runa-commander-popover-shadow)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

export const commanderPathSuggestionsScrollStyle: CSSProperties = {
  maxHeight: '176px',
  minHeight: 0,
  padding: 0,
  background: 'transparent',
}

export const commanderPathSuggestionItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--runa-commander-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  textAlign: 'left',
  cursor: 'pointer',
}

export const commanderPathSuggestionActiveStyle: CSSProperties = {
  background: 'var(--runa-commander-highlight-fill)',
  color: 'var(--runa-commander-highlight-text)',
  boxShadow: 'inset 0 0 0 1px var(--runa-commander-highlight-ring)',
}

export const commanderPathSuggestionTextStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
}

export const commanderPathSuggestionMetaStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  textTransform: 'uppercase',
}

export const commanderPathInputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: '24px',
  minHeight: '24px',
  padding: '0 var(--space-xs)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-input-bg)',
  border: '1px solid var(--runa-commander-highlight-border)',
  boxShadow: 'inset 0 0 0 1px var(--runa-commander-highlight-ring)',
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

export const commanderPaneStatusBadgeStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-status-border)',
  background: 'var(--runa-commander-status-bg)',
  color: 'var(--runa-commander-text-secondary)',
}

export const commanderPaneErrorBadgeStyle: CSSProperties = {
  borderColor: 'var(--runa-commander-error-border)',
  background: 'var(--runa-commander-error-bg)',
  color: 'var(--runa-commander-error-text)',
}

export const commanderListHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0, 1fr) 34px 72px 116px',
  gap: 'var(--gap-sm)',
  alignItems: 'center',
  minHeight: '24px',
  padding: '0 var(--space-sm)',
  background: 'var(--runa-commander-list-header-bg)',
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const commanderListHeaderButtonStyle: CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  minHeight: '24px',
  height: '24px',
  margin: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  outline: 'none',
  background: 'transparent',
  color: 'var(--runa-commander-text-muted)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  justifyContent: 'flex-start',
  textAlign: 'left',
  userSelect: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderListHeaderButtonActiveStyle: CSSProperties = {
  color: 'var(--runa-commander-highlight-text)',
}

export const commanderListHeaderButtonEndAlignedStyle: CSSProperties = {
  justifyContent: 'flex-end',
  textAlign: 'right',
}

export const commanderListHeaderButtonCenterAlignedStyle: CSSProperties = {
  justifyContent: 'center',
  textAlign: 'center',
}

export const commanderListHeaderLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
}

export const commanderListHeaderSortIndicatorStyle: CSSProperties = {
  color: 'inherit',
  fontFamily: 'inherit',
  fontSize: '10px',
  lineHeight: '10px',
}

export const commanderScrollAreaStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: 0,
  background: 'var(--runa-commander-scroll-bg)',
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

export const commanderStatusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: '32px',
  padding: '0 var(--space-sm)',
  borderBottom: '1px solid var(--runa-commander-row-divider)',
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderStatusRowErrorStyle: CSSProperties = {
  color: 'var(--runa-commander-error-text)',
  borderBottomColor: 'var(--runa-commander-error-border)',
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
  background: 'var(--runa-commander-type-bg)',
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
  background: 'var(--runa-commander-footer-bg)',
  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
}

export const commanderFooterTextStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}
