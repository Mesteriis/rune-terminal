import type * as React from 'react'

export const terminalWidgetRootStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  flexDirection: 'column',
  gap: '0.45rem',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const terminalWidgetChromeStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  padding: 0,
  border:
    '1px solid color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 94%, transparent)',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 82%, var(--color-surface-canvas, transparent) 18%)',
  boxShadow: '0 12px 32px color-mix(in srgb, var(--color-shadow, rgba(0, 0, 0, 0.28)) 20%, transparent)',
  overflow: 'hidden',
}

export const terminalWidgetHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.68rem 0.78rem 0.52rem',
  borderBottom:
    '1px solid color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 74%, transparent)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 88%, var(--color-surface-canvas, transparent) 12%)',
}

export const terminalWidgetToolbarRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  padding: '0.42rem 0.78rem 0.54rem',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 80%, var(--color-surface-canvas, transparent) 20%)',
}

export const terminalWidgetSessionRailStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.32rem',
  flexWrap: 'wrap',
  padding: '0 0.78rem 0.52rem',
  borderBottom:
    '1px solid color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 62%, transparent)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 74%, var(--color-surface-canvas, transparent) 26%)',
}

export const terminalWidgetCommandStripStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.34rem',
  padding: '0 0.78rem 0.58rem',
  borderBottom:
    '1px solid color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 62%, transparent)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 72%, var(--color-surface-canvas, transparent) 28%)',
}

export const terminalWidgetCommandStripHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
}

export const terminalWidgetCommandStripMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.32rem',
  flexWrap: 'wrap',
  alignItems: 'center',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  fontSize: '0.72rem',
}

export const terminalWidgetCommandValueStyle: React.CSSProperties = {
  margin: 0,
  padding: '0.52rem 0.62rem',
  border:
    '1px solid color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 72%, transparent)',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 66%, transparent)',
  color: 'var(--color-text-primary)',
  fontSize: '0.76rem',
  lineHeight: 1.4,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const terminalWidgetCommandExcerptStyle: React.CSSProperties = {
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  fontSize: '0.74rem',
  lineHeight: 1.45,
}

export const terminalWidgetCommandActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.32rem',
  flexWrap: 'wrap',
  alignItems: 'center',
}

export const terminalWidgetSessionBrowserStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.42rem',
  padding: '0 0.78rem 0.58rem',
  borderBottom: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
}

export const terminalWidgetSessionBrowserFilterStyle: React.CSSProperties = {
  minHeight: '28px',
  padding: '0 0.62rem',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 72%, transparent)',
  color: 'var(--color-text-primary)',
}

export const terminalWidgetSessionBrowserListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.32rem',
}

export const terminalWidgetSessionCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.18rem',
  padding: '0.52rem 0.62rem',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 78%, transparent)',
}

export const terminalWidgetSessionCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  flexWrap: 'wrap',
}

export const terminalWidgetSessionCardMetaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.32rem',
  flexWrap: 'wrap',
  alignItems: 'center',
}

export const terminalWidgetSessionCardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.32rem',
  flexWrap: 'wrap',
  alignItems: 'center',
}

export const terminalWidgetSessionButtonStyle: React.CSSProperties = {
  ['--runa-ui-bg' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 60%, transparent)',
  ['--runa-ui-border' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 82%, transparent)',
  ['--runa-ui-color' as string]: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  minHeight: '30px',
  padding: '0.34rem 0.54rem',
  borderRadius: 'var(--radius-sm)',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.08rem',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  textAlign: 'left',
}

export const terminalWidgetSessionButtonActiveStyle: React.CSSProperties = {
  ['--runa-ui-bg' as string]:
    'color-mix(in srgb, var(--color-accent-bg, var(--color-surface-glass-soft)) 34%, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 66%)',
  ['--runa-ui-border' as string]: 'var(--color-accent-border, var(--color-accent-text))',
  ['--runa-ui-color' as string]: 'var(--color-accent-text)',
}

export const terminalWidgetSessionMetaStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  lineHeight: 1.2,
  opacity: 0.78,
}

export const terminalWidgetSurfaceWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  background:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 64%, var(--color-surface-canvas, transparent) 36%)',
}

export const terminalWidgetHeaderActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
}

export const terminalWidgetHeaderActionButtonStyle: React.CSSProperties = {
  ['--runa-ui-bg' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 62%, transparent)',
  ['--runa-ui-border' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 82%, transparent)',
  ['--runa-ui-color' as string]: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
  width: '26px',
  minWidth: '26px',
  minHeight: '26px',
  height: '26px',
  padding: 0,
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
}

export const terminalWidgetAiActionButtonStyle: React.CSSProperties = {
  ['--runa-ui-bg' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-bg, var(--color-surface-glass-soft)) 60%, transparent)',
  ['--runa-ui-border' as string]:
    'color-mix(in srgb, var(--runa-terminal-surface-border, var(--color-border-subtle)) 82%, transparent)',
  ['--runa-ui-color' as string]: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
  minHeight: '26px',
  padding: '0 0.62rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.76rem',
  lineHeight: 1,
  fontWeight: 600,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.34rem',
}
