export const providerSettingsRootStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  flex: 1,
  minHeight: 0,
}

export const providerSettingsToolbarStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  flexWrap: 'wrap' as const,
}

export const providerSettingsToolbarMetaStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  maxWidth: '48rem',
}

export const providerSettingsToolbarActionsStyle = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap' as const,
  justifyContent: 'flex-end',
}

export const providerSettingsBodyStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(18rem, 24rem) minmax(0, 1fr)',
  gap: 'var(--gap-md)',
  flex: 1,
  minHeight: 0,
}

export const providerSettingsEmbeddedToolbarStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  flexWrap: 'wrap' as const,
  paddingBottom: 'var(--gap-md)',
  borderBottom: '1px solid var(--color-border-subtle)',
}

export const providerSettingsEmbeddedBodyStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(18rem, 22rem) minmax(0, 1fr)',
  gap: 'var(--gap-lg)',
  flex: 1,
  minHeight: 0,
}

export const providerSettingsSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  minHeight: 0,
  overflow: 'hidden',
}

export const providerSettingsEmbeddedSidebarStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  minHeight: 0,
  overflow: 'hidden',
  paddingRight: 'var(--gap-md)',
  borderRight: '1px solid var(--color-border-subtle)',
}

export const providerSettingsListStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  minHeight: 0,
  paddingRight: 'var(--gap-xs)',
}

export const providerSettingsListCardStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'stretch',
  gap: 'var(--gap-xs)',
  padding: 'var(--padding-panel)',
  textAlign: 'left' as const,
}

export const providerSettingsListCardMetaStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
}

export const providerSettingsEditorStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  minHeight: 0,
  overflow: 'hidden',
}

export const providerSettingsEmbeddedEditorStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  minHeight: 0,
  overflow: 'hidden',
}

export const providerSettingsEditorScrollStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  minHeight: 0,
  paddingRight: 'var(--gap-xs)',
}

export const providerSettingsSectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
}

export const providerSettingsSectionHeaderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const providerSettingsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
  gap: 'var(--gap-md)',
}

export const providerSettingsFieldStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const providerSettingsInlineCheckboxStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
}

export const providerSettingsChannelCardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
}

export const providerSettingsChannelHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  flexWrap: 'wrap' as const,
}

export const providerSettingsChannelMetaStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

export const providerSettingsChannelActionsStyle = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap' as const,
}

export const providerSettingsActionsBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  flexWrap: 'wrap' as const,
  borderTop: '1px solid var(--color-border-subtle)',
  paddingTop: 'var(--gap-sm)',
}

export const providerSettingsActionsGroupStyle = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap' as const,
}

export const providerSettingsStatusMessageStyle = {
  color: 'var(--color-text-secondary)',
}

export const providerSettingsErrorMessageStyle = {
  color: 'var(--color-danger-text, #ff8e8e)',
}
