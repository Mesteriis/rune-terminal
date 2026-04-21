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
  background: 'var(--color-surface-shell-header-gradient)',
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
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
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
  background: 'var(--color-surface-shell-header-action)',
  color: 'var(--color-text-secondary)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiMessageStackStyle: CSSProperties = {
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
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollPaddingBottom: 'var(--space-md)',
}

export const aiChatMessageCardStyle: CSSProperties = {
  minWidth: 0,
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  padding: 'var(--space-md)',
  background: 'var(--color-canvas-elevated)',
  borderColor: 'var(--color-border-strong)',
}

export const aiChatMessageHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minWidth: 0,
}

export const aiChatMessageRoleStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '18px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export const aiChatMessageContentStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '14px',
  lineHeight: '20px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiPromptCardStyle: CSSProperties = {
  minWidth: 0,
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  padding: 'var(--space-md)',
  background: 'var(--color-canvas-elevated)',
  borderColor: 'var(--color-border-strong)',
  cursor: 'pointer',
  userSelect: 'none',
}

export const aiPromptTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '16px',
  lineHeight: '22px',
}

export const aiPromptSubtitleStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  fontFamily: 'var(--font-family-mono)',
}

export const aiPromptCardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptCardTitleClusterStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptCardActionRowStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptCardActionStyle: CSSProperties = {
  width: '26px',
  minWidth: '26px',
  minHeight: '26px',
  height: '26px',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--color-text-muted)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptCardPreviewStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-md)',
  fontFamily: 'var(--font-family-mono)',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
}

export const aiPromptCardExpandedBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  minWidth: 0,
}

export const aiPromptReasoningListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptReasoningItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 'var(--space-xs) 0',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptReasoningIndexStyle: CSSProperties = {
  minWidth: '22px',
  minHeight: '18px',
  alignSelf: 'flex-start',
  borderColor: 'var(--color-border-strong)',
  background: 'var(--color-accent-emerald-soft)',
  color: 'var(--color-text-primary)',
}

export const aiPromptApprovalListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptApprovalRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
  padding: 'var(--space-sm)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptApprovalMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptApprovalStatusBadgeStyle: CSSProperties = {
  minHeight: '18px',
  borderColor: 'var(--color-accent-warning-border)',
  background: 'var(--color-accent-warning-bg)',
  color: 'var(--color-accent-warning-text)',
}

export const aiPromptApprovalCommandStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontSize: '12px',
  lineHeight: '18px',
  fontFamily: 'var(--font-family-mono)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiPromptCardSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
}

export const aiPromptSectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptPromptSectionStyle: CSSProperties = {
  ...aiPromptCardSectionStyle,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptReasoningSectionStyle: CSSProperties = {
  ...aiPromptCardSectionStyle,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptApprovalSectionStyle: CSSProperties = {
  ...aiPromptCardSectionStyle,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptSummarySectionStyle: CSSProperties = {
  ...aiPromptCardSectionStyle,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiPromptCardSectionLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: '11px',
  lineHeight: '14px',
  fontFamily: 'var(--font-family-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

export const aiPromptCardSectionTextStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-md)',
  fontFamily: 'var(--font-family-mono)',
  whiteSpace: 'pre-wrap',
}

export const aiPromptReasoningTextStyle: CSSProperties = {
  ...aiPromptCardSectionTextStyle,
  flex: 1,
  minWidth: 0,
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
