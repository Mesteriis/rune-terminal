import type { CSSProperties } from 'react'

export const commanderFileDialogOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 'var(--z-modal-widget)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3% 5%',
  background: 'var(--runa-commander-dialog-overlay-bg)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

export const commanderFileDialogStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr) auto',
  gap: 'var(--gap-sm)',
  padding: 'var(--space-md)',
  border: '1px solid var(--runa-commander-highlight-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--runa-commander-dialog-bg)',
  boxShadow: 'var(--runa-commander-dialog-shadow)',
}

export const commanderFileDialogHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
}

export const commanderFileDialogTitleClusterStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-xs)',
  minWidth: 0,
}

export const commanderFileDialogTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
}

export const commanderFileDialogTitleStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-strong)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-md)',
  fontWeight: 600,
}

export const commanderFileDialogPathStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

export const commanderFileDialogActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

export const commanderFileDialogTextAreaStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  resize: 'none',
  padding: 'var(--space-sm)',
  border: '1px solid var(--runa-commander-surface-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-dialog-field-bg)',
  color: 'var(--runa-commander-text-strong)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: '1.45',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const commanderFileDialogBlockedBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  padding: 'var(--space-lg)',
  border: '1px solid var(--runa-commander-surface-border)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--runa-commander-dialog-blocked-bg)',
}

export const commanderFileDialogBlockedTitleStyle: CSSProperties = {
  color: 'var(--runa-commander-text-strong)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-lg)',
  lineHeight: 'var(--line-height-lg)',
  fontWeight: 600,
}

export const commanderFileDialogBlockedReasonStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-md)',
  lineHeight: '1.5',
  maxWidth: '72ch',
}

export const commanderFileDialogFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  flexWrap: 'wrap',
}

export const commanderFileDialogMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  flexWrap: 'wrap',
  minWidth: 0,
}

export const commanderFileDialogClosePromptStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

export const commanderFileDialogHintStyle: CSSProperties = {
  color: 'var(--runa-commander-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}
