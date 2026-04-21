import type { CSSProperties } from 'react'

const aiPlainBlockStyle: CSSProperties = {
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

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
  background: 'var(--color-surface-shell-header-gradient)',
  borderColor: 'var(--color-border-strong)',
}

export const aiShellHeaderTitleLaneStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-md)',
  padding: '0 var(--space-md)',
}

export const aiShellHeaderLogoSlotStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: '0 0 32px',
  width: '32px',
  minWidth: '32px',
  minHeight: '32px',
  height: '32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const aiShellTitleClusterStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

export const aiShellTitleTextStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '21px',
  lineHeight: '26px',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
}

export const aiHeaderModeGroupStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'stretch',
  gap: 0,
  borderLeft: '1px solid var(--color-border-strong)',
}

export const aiHeaderModeButtonStyle: CSSProperties = {
  minWidth: '64px',
  minHeight: '48px',
  padding: '0 var(--space-sm)',
  border: 'none',
  borderRadius: 0,
  borderLeft: '1px solid color-mix(in srgb, var(--color-border-strong) 68%, transparent)',
  background: 'var(--color-surface-shell-header-action)',
  color: 'var(--color-text-muted)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export const aiHeaderModeButtonActiveStyle: CSSProperties = {
  background:
    'color-mix(in srgb, var(--color-accent-emerald-soft) 54%, var(--color-surface-shell-header-action))',
  color: 'var(--color-text-primary)',
}

export const aiMessageViewportStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
}

export const aiChatStreamStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  minWidth: 0,
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--space-sm) var(--space-md) 0',
  scrollPaddingBottom: 'var(--space-md)',
}

export const aiChatMessageRowStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  paddingBottom: 'var(--space-lg)',
}

export const aiChatMessageGroupedRowStyle: CSSProperties = {
  paddingBottom: 'var(--space-xs)',
}

export const aiChatMessageGroupStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  minWidth: 0,
  width: '100%',
  maxWidth: '600px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
}

export const aiChatMessageUserRowStyle: CSSProperties = {
  justifyContent: 'flex-end',
}

export const aiChatMessageUserGroupStyle: CSSProperties = {
  alignItems: 'flex-end',
}

export const aiChatMessageAssistantRowStyle: CSSProperties = {
  justifyContent: 'flex-start',
}

export const aiChatMessageAssistantGroupStyle: CSSProperties = {
  alignItems: 'flex-start',
}

export const aiMessageBubbleStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  minWidth: 0,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: '16px',
}

export const aiMessageBubbleUserStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-accent-emerald-soft) 28%, var(--color-canvas-elevated))',
  borderColor: 'transparent',
}

export const aiMessageBubbleAssistantStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 68%, transparent)',
  borderColor: 'transparent',
}

export const aiMessageBubbleContentStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '15px',
  lineHeight: '24px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiChatMessageMetaLineStyle: CSSProperties = {
  color: 'color-mix(in srgb, var(--color-text-muted) 72%, transparent)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
}

export const aiChatMessageDetailsToggleStyle: CSSProperties = {
  minWidth: 'unset',
  minHeight: 'unset',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  color: 'color-mix(in srgb, var(--color-text-muted) 82%, transparent)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '18px',
}

export const aiChatMessageDetailsPanelStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: '14px',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 56%, transparent)',
  borderColor: 'transparent',
}

export const aiChatMessageDetailsSectionStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: 0,
}

export const aiChatMessageDetailsLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export const aiChatMessageDetailsTextStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '18px',
}

export const aiChatMessageDetailsValueStyle: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
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
  background: 'var(--color-accent-emerald-soft)',
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
