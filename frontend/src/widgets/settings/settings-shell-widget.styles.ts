export const settingsShellRootStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(14rem, 17.5rem) minmax(0, 1fr)',
  gap: '0',
  flex: 1,
  minHeight: 0,
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 74%, transparent)',
}

export const settingsShellSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0',
  borderRight: '1px solid var(--color-border-subtle)',
  minHeight: 0,
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 58%, transparent)',
}

export const settingsShellSidebarHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
  padding: '1rem 1rem 0.9rem 1rem',
  borderBottom: '1px solid var(--color-border-subtle)',
}

export const settingsShellSidebarSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.2rem',
  padding: '0.65rem',
}

export const settingsShellSidebarSectionSpacingStyle = {
  marginTop: '0',
}

export const settingsShellNavButtonStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  gap: '0.15rem',
  padding: '0.75rem 0.85rem',
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
  gap: '0.2rem',
  marginLeft: '0.45rem',
  paddingLeft: '0.65rem',
  paddingTop: '0.15rem',
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
  margin: '0.9rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 52%, transparent)',
}

export const settingsShellShellHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.4rem',
  padding: '1rem 1.15rem',
  borderBottom: '1px solid var(--color-border-subtle)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 55%, transparent)',
}

export const settingsShellEyebrowStyle = {
  fontSize: '0.74rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-tertiary, var(--color-text-secondary))',
}

export const settingsShellContentScrollStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1.1rem',
  minHeight: 0,
  padding: '1rem 1.15rem 1.2rem 1.15rem',
}

export const settingsShellSectionCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: '0.95rem 0 0 0',
  borderTop: '1px solid var(--color-border-subtle)',
}

export const settingsShellCardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  gap: 'var(--gap-sm)',
}

export const settingsShellListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
}

export const settingsShellListRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  flexWrap: 'wrap' as const,
  padding: '0.75rem 0.9rem',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 48%, transparent)',
}

export const settingsShellBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.16rem 0.5rem',
  borderRadius: '999px',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.78rem',
}

export const settingsShellMutedTextStyle = {
  color: 'var(--color-text-secondary)',
}
