import type { CSSProperties } from 'react'

export const aiPanelRootStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  padding: 0,
  overflow: 'hidden',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiPanelContentColumnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiShellHeaderStyle: CSSProperties = {
  minHeight: '48px',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'space-between',
  gap: 0,
  width: '100%',
  minWidth: 0,
  padding: 0,
  background: 'linear-gradient(180deg, rgba(15, 31, 28, 0.98), rgba(10, 22, 20, 0.98))',
  borderColor: 'var(--color-border-strong)',
}

export const aiShellHeaderTitleLaneStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  padding: '0 var(--space-md)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiShellHeaderLogoSlotStyle: CSSProperties = {
  flex: '0 0 32px',
  width: '32px',
  minWidth: '32px',
  minHeight: '32px',
  height: '32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(130, 188, 170, 0.34)',
  borderRadius: 'var(--radius-sm)',
  background:
    'linear-gradient(180deg, rgba(36, 75, 67, 0.72), rgba(15, 29, 26, 0.94))',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.03)',
}

export const aiShellHeaderLogoIconStyle: CSSProperties = {
  color: 'rgb(193, 226, 215)',
}

export const aiShellTitleClusterStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiShellTitleTextStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '21px',
  lineHeight: '26px',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
}

export const aiHeaderActionStyle: CSSProperties = {
  alignSelf: 'stretch',
  width: '44px',
  minWidth: '44px',
  minHeight: '48px',
  height: 'auto',
  borderRadius: 0,
  border: 'none',
  borderLeft: '1px solid var(--color-border-strong)',
  background: 'rgba(14, 28, 25, 0.92)',
  color: 'var(--color-text-secondary)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptStackStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'grid',
  gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 'var(--gap-sm)',
  padding: 'var(--gap-sm) 0 0',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiPromptCardStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: 'var(--space-lg) var(--space-md)',
  background: 'var(--color-canvas-elevated)',
  borderColor: 'var(--color-border-subtle)',
}

export const aiPromptTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '18px',
  lineHeight: '24px',
}

export const aiPromptSubtitleStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const aiToolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minHeight: '28px',
  padding: '0 var(--space-md)',
  background: 'var(--color-canvas-elevated)',
}

export const aiToolbarLabelStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

export const aiToolbarChipStyle: CSSProperties = {
  minHeight: '22px',
  minWidth: 'auto',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-xs)',
  borderColor: 'var(--color-border-strong)',
  background: 'rgba(45, 143, 118, 0.12)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
}

export const aiComposerSurfaceStyle: CSSProperties = {
  minWidth: 0,
  minHeight: '180px',
  display: 'flex',
  gap: 'var(--gap-sm)',
  padding: 'var(--space-sm)',
  background: 'var(--color-canvas-elevated)',
  borderColor: 'var(--color-border-strong)',
}

export const aiComposerTextAreaStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  resize: 'none',
  border: 'none',
  background: 'transparent',
  boxShadow: 'none',
  padding: 'var(--space-md)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '18px',
  lineHeight: '26px',
}

export const aiComposerActionRailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
}

export const aiComposerActionStyle: CSSProperties = {
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--color-border-strong)',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text-secondary)',
  boxShadow: 'none',
}
