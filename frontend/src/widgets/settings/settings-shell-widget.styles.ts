export const settingsShellRootStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(13rem, 17rem) minmax(0, 1fr)',
  gap: 'var(--gap-md)',
  flex: 1,
  minHeight: 0,
}

export const settingsShellSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  padding: 'var(--padding-panel)',
  minHeight: 0,
}

export const settingsShellSidebarSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const settingsShellSidebarLabelStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: '0.78rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}

export const settingsShellNavButtonStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  gap: '0.15rem',
  padding: '0.75rem 0.9rem',
  textAlign: 'left' as const,
}

export const settingsShellNestedNavStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  marginLeft: 'var(--gap-xs)',
  paddingLeft: 'var(--gap-sm)',
  borderLeft: '1px solid var(--color-border-subtle)',
}

export const settingsShellContentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  minHeight: 0,
}

export const settingsShellContentHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const settingsShellContentScrollStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  minHeight: 0,
  paddingRight: 'var(--gap-xs)',
}

export const settingsShellSectionCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: 'var(--padding-panel)',
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
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-soft)',
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
