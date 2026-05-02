export const settingsShellRootStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(13.4rem, 16.2rem) minmax(0, 1fr)',
  gap: '0',
  flex: 1,
  minHeight: 0,
  border: 'none',
  borderRadius: 0,
  overflow: 'hidden',
  background: 'transparent',
}

export const settingsShellSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0',
  borderRight: '1px solid var(--color-border-subtle)',
  minHeight: 0,
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  overscrollBehavior: 'contain',
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 62%, transparent)',
}

export const settingsShellSidebarSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.16rem',
  padding: '0.55rem',
}

export const settingsShellSidebarSectionSpacingStyle = {
  marginTop: '0',
}

export const settingsShellNavButtonStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  gap: '0.12rem',
  padding: '0.62rem 0.72rem',
  textAlign: 'left' as const,
  justifyContent: 'flex-start',
  background: 'transparent',
  border: '1px solid transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  borderRadius: 'var(--radius-sm)',
  transition: 'background 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
}

export const settingsShellParentNavStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  width: '100%',
}

export const settingsShellNestedNavStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.16rem',
  marginLeft: '0.35rem',
  paddingLeft: '0.55rem',
  paddingTop: '0.08rem',
  borderLeft: '1px solid var(--color-border-subtle)',
}

export const settingsShellContentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  minHeight: 0,
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 32%, transparent)',
}

export const settingsShellContentHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const settingsShellContentPanelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  minHeight: 0,
  margin: '0.75rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 56%, transparent)',
}

export const settingsShellShellHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.32rem',
  padding: '0.85rem 1rem',
  borderBottom: '1px solid var(--color-border-subtle)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 60%, transparent)',
}

export const settingsShellEyebrowStyle = {
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-tertiary, var(--color-text-secondary))',
}

export const settingsShellContentScrollStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.95rem',
  minHeight: 0,
  padding: '0.85rem 1rem 1rem 1rem',
}

export const settingsShellSectionCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.65rem',
  padding: '0.78rem 0 0 0',
  borderTop: '1px solid var(--color-border-subtle)',
}

export const settingsShellCardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  gap: '0.7rem',
}

export const settingsShellListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.65rem',
}

export const settingsShellListRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '0.7rem',
  flexWrap: 'wrap' as const,
  padding: '0.66rem 0.78rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 54%, transparent)',
}

export const settingsShellBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '20px',
  padding: '0.08rem 0.42rem',
  border: '1px solid color-mix(in srgb, var(--color-border-subtle) 84%, transparent)',
  borderRadius: '999px',
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 66%, transparent)',
  color: 'var(--color-text-muted, var(--color-text-secondary))',
  fontSize: '0.74rem',
  lineHeight: 1,
}

export const settingsShellMutedTextStyle = {
  color: 'var(--color-text-secondary)',
}

export const settingsShellErrorTextStyle = {
  color: 'var(--color-danger-text)',
}

export const settingsShellInlineLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  color: 'var(--color-text-primary)',
}
