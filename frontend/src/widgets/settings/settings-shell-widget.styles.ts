export const settingsShellRootStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(13rem, 17rem) minmax(0, 1fr)',
  gap: 'var(--gap-lg)',
  flex: 1,
  minHeight: 0,
}

export const settingsShellSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  paddingRight: 'var(--gap-md)',
  borderRight: '1px solid var(--color-border-subtle)',
  minHeight: 0,
}

export const settingsShellSidebarSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const settingsShellSidebarSectionSpacingStyle = {
  marginTop: 'var(--gap-sm)',
}

export const settingsShellNavButtonStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  gap: '0.15rem',
  padding: '0.75rem 0.9rem',
  textAlign: 'left' as const,
  justifyContent: 'flex-start',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  borderRadius: 'var(--radius-sm)',
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
  gap: 'var(--gap-xs)',
  marginLeft: 'var(--gap-sm)',
  paddingLeft: 'var(--gap-sm)',
  borderLeft: '1px solid var(--color-border-subtle)',
}

export const settingsShellContentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
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
  paddingRight: 'var(--gap-sm)',
}

export const settingsShellSectionCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: '0 0 var(--gap-md) 0',
  borderBottom: '1px solid var(--color-border-subtle)',
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
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 70%, transparent)',
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
