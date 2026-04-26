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
  flex: '0 0 auto',
  minWidth: 0,
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
}

export const aiShellTitleTextStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '18px',
  lineHeight: '24px',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
}

export const aiShellRouteClusterStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: '0 1 320px',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  padding: '6px 8px',
  borderRadius: '10px',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 52%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 76%, transparent)',
}

export const aiShellRouteSummaryStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

export const aiShellRouteTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const aiShellRouteMetaStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '13px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const aiShellRouteActionStyle: CSSProperties = {
  minWidth: 'unset',
  minHeight: '26px',
  padding: '0 8px',
  borderRadius: '8px',
  background: 'color-mix(in srgb, var(--color-surface-elevated) 90%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 56%, transparent)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '12px',
}

export const aiHeaderConversationGroupStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--space-xs)',
  position: 'relative',
}

export const aiHeaderConversationLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

export const aiHeaderConversationTriggerStyle: CSSProperties = {
  minWidth: 'unset',
  width: 'min(320px, 100%)',
  minHeight: '32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  padding: '0 var(--space-sm)',
  borderRadius: '10px',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 82%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export const aiHeaderConversationTriggerLeadingStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
}

export const aiHeaderConversationSummaryStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '2px',
}

export const aiHeaderConversationSummaryTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const aiHeaderConversationSummaryMetaStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const aiHeaderConversationDropdownWrapStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  position: 'absolute',
  top: 'calc(100% + var(--space-xs))',
  right: 0,
  width: 'min(360px, calc(100vw - 48px))',
  zIndex: 'var(--z-modal-widget)',
}

export const aiHeaderConversationDropdownStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm)',
  borderRadius: '14px',
  background: 'color-mix(in srgb, var(--color-surface-shell-header) 90%, var(--color-canvas-elevated))',
  borderColor: 'var(--color-border-strong)',
  boxShadow: 'var(--shadow-glass-panel)',
  backdropFilter: 'var(--blur-glass-md)',
  WebkitBackdropFilter: 'var(--blur-glass-md)',
}

export const aiHeaderConversationDropdownHeaderStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 'var(--space-sm)',
}

export const aiHeaderConversationDropdownHeaderTopStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
}

export const aiHeaderConversationDropdownActionsStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}

export const aiHeaderConversationMenuSummaryStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

export const aiHeaderConversationMenuMetaStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
}

export const aiHeaderConversationSearchWrapStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

export const aiHeaderConversationCurrentBlockStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: 'var(--space-sm)',
  borderRadius: '12px',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 68%, transparent)',
}

export const aiHeaderConversationCurrentHeaderStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
}

export const aiHeaderConversationCurrentBadgeStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '20px',
  padding: '0 var(--space-xs)',
  borderRadius: '999px',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 56%, transparent)',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 58%, transparent)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export const aiHeaderConversationScopeStripStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

export const aiHeaderConversationScopeButtonStyle: CSSProperties = {
  minHeight: '28px',
  padding: '0 10px',
  borderRadius: '999px',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 74%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 56%, transparent)',
  boxShadow: 'none',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export const aiHeaderConversationScopeButtonActiveStyle: CSSProperties = {
  background:
    'color-mix(in srgb, var(--color-accent-emerald-soft) 26%, var(--color-surface-shell-header-action))',
  borderColor: 'color-mix(in srgb, var(--color-accent-emerald-soft) 42%, var(--color-border-strong))',
  color: 'var(--color-text-primary)',
}

export const aiHeaderConversationSearchInputStyle: CSSProperties = {
  width: '100%',
}

export const aiHeaderConversationEmptyStateStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '72px',
  padding: 'var(--space-sm)',
  borderRadius: '12px',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 52%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 68%, transparent)',
}

export const aiHeaderConversationMenuListStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  maxHeight: '280px',
  overflowY: 'auto',
}

export const aiHeaderConversationMenuSectionStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

export const aiHeaderConversationMenuSectionTitleStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '14px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '0 var(--space-xs)',
}

export const aiHeaderConversationMenuOptionStyle: CSSProperties = {
  minWidth: 'unset',
  width: '100%',
  minHeight: '48px',
  justifyContent: 'flex-start',
  padding: 'var(--space-sm)',
  borderRadius: '12px',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 74%, transparent)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
  textAlign: 'left',
}

export const aiHeaderConversationMenuOptionActiveStyle: CSSProperties = {
  background:
    'color-mix(in srgb, var(--color-accent-emerald-soft) 26%, var(--color-surface-shell-header-action))',
  borderColor: 'color-mix(in srgb, var(--color-accent-emerald-soft) 42%, var(--color-border-strong))',
}

export const aiHeaderConversationMenuOptionHighlightedStyle: CSSProperties = {
  background:
    'color-mix(in srgb, var(--color-accent-emerald-soft) 14%, var(--color-surface-shell-header-action))',
  borderColor: 'color-mix(in srgb, var(--color-accent-emerald-soft) 28%, var(--color-border-strong))',
}

export const aiHeaderConversationMenuOptionLeadingStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '2px',
}

export const aiHeaderConversationMenuRowStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'stretch',
  gap: '6px',
}

export const aiHeaderConversationMenuOptionSelectStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
}

export const aiHeaderConversationMenuRowActionsStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

export const aiHeaderConversationMenuRowActionStyle: CSSProperties = {
  minWidth: '32px',
  width: '32px',
  minHeight: '48px',
  padding: '0',
  borderRadius: '10px',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 66%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
}

export const aiHeaderConversationActionStyle: CSSProperties = {
  minHeight: '32px',
  padding: '0 var(--space-sm)',
  borderRadius: '10px',
  background:
    'color-mix(in srgb, var(--color-accent-emerald-soft) 34%, var(--color-surface-shell-header-action))',
  borderColor: 'color-mix(in srgb, var(--color-border-strong) 62%, transparent)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

export const aiHeaderConversationRenamePanelStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: 'var(--space-sm)',
  borderRadius: '12px',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  background: 'color-mix(in srgb, var(--color-surface-shell-header-action) 68%, transparent)',
}

export const aiHeaderConversationRenameActionsStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'inline-flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '6px',
}

export const aiHeaderConversationRenameInputStyle: CSSProperties = {
  minHeight: '34px',
  borderRadius: '10px',
  background: 'color-mix(in srgb, var(--color-surface-input) 84%, transparent)',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 62%, transparent)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
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

export const aiChatMessageMetaBarStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  flexWrap: 'wrap',
}

export const aiChatMessageMetaBadgeStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '22px',
  maxWidth: '100%',
  padding: '0 var(--space-sm)',
  borderRadius: '999px',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 58%, transparent)',
  borderColor: 'transparent',
}

export const aiChatMessageDetailsToggleStyle: CSSProperties = {
  minWidth: 'unset',
  minHeight: '24px',
  padding: '0 var(--space-sm)',
  border: '1px solid color-mix(in srgb, var(--color-border-strong) 58%, transparent)',
  borderRadius: '999px',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 62%, transparent)',
  color: 'var(--color-text-secondary)',
  boxShadow: 'none',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
}

export const aiChatMessageDetailsPanelStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: '14px',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 72%, transparent)',
  borderColor: 'transparent',
}

export const aiChatMessageDetailsHeaderStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  flexWrap: 'wrap',
}

export const aiChatMessageDetailsHeaderTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export const aiChatMessageDetailsHeaderMetaStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
}

export const aiChatMessageDetailsSectionStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
  padding: 'var(--space-xs) var(--space-sm)',
  borderRadius: '10px',
  background: 'color-mix(in srgb, var(--color-canvas) 84%, var(--color-canvas-elevated))',
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

export const aiInteractionBlockStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: '16px',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 60%, transparent)',
}

export const aiInteractionSectionStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
  minWidth: 0,
}

export const aiInteractionTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '13px',
  lineHeight: '18px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

export const aiInteractionListStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
}

export const aiInteractionListItemStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '14px',
  lineHeight: '22px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiInteractionMutedTextStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '18px',
}

export const aiApprovalActionsStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  gap: 'var(--space-sm)',
  flexWrap: 'wrap',
}

export const aiApprovalButtonStyle: CSSProperties = {
  minWidth: '112px',
  boxShadow: 'none',
}

export const aiApprovalCancelButtonStyle: CSSProperties = {
  ...aiApprovalButtonStyle,
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 70%, transparent)',
  color: 'var(--color-text-primary)',
}

export const aiApprovalStatusStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '14px',
  lineHeight: '22px',
}

export const aiAuditEntryRowStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr) auto',
  gap: 'var(--space-sm)',
  alignItems: 'center',
}

export const aiAuditEntryMetaStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
}

export const aiAuditEntryStatusPendingStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase',
}

export const aiAuditEntryStatusRunningStyle: CSSProperties = {
  ...aiAuditEntryStatusPendingStyle,
  color: 'var(--color-text-primary)',
}

export const aiAuditEntryStatusDoneStyle: CSSProperties = {
  ...aiAuditEntryStatusPendingStyle,
  color: 'var(--color-accent-emerald-soft)',
}

export const aiAuditEntryStatusErrorStyle: CSSProperties = {
  ...aiAuditEntryStatusPendingStyle,
  color: 'var(--color-danger-text)',
}

export const aiQuestionnaireActionsStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
}

export const aiQuestionnaireOptionButtonStyle: CSSProperties = {
  minWidth: '112px',
  justifyContent: 'flex-start',
  boxShadow: 'none',
}

export const aiQuestionnaireInputRowStyle: CSSProperties = {
  ...aiPlainBlockStyle,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 'var(--space-sm)',
  alignItems: 'center',
}

export const aiToolbarStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 'var(--space-xs)',
  minHeight: '28px',
  padding: 'var(--space-xs) var(--space-md)',
  background: 'var(--color-canvas-elevated)',
}

export const aiToolbarMetaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  minWidth: 0,
}

export const aiToolbarControlStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  minWidth: 0,
  padding: 'var(--space-xs)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 78%, transparent)',
}

export const aiToolbarControlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 'var(--space-sm)',
  minWidth: 0,
  flexWrap: 'wrap',
  flex: 1,
}

export const aiToolbarFieldStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: 0,
}

export const aiToolbarFieldLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '10px',
  lineHeight: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  paddingLeft: '2px',
}

export const aiToolbarStatusClusterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 'var(--space-xs)',
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

export const aiToolbarModelSelectStyle: CSSProperties = {
  width: 'min(16rem, 42vw)',
  minWidth: '9rem',
  paddingTop: '0.32rem',
  paddingBottom: '0.32rem',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  background: 'var(--color-surface-glass-strong)',
}

export const aiToolbarProviderSelectStyle: CSSProperties = {
  width: 'min(14rem, 34vw)',
  minWidth: '9rem',
  paddingTop: '0.32rem',
  paddingBottom: '0.32rem',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  background: 'var(--color-surface-glass-strong)',
}

export const aiToolbarContextTriggerStyle: CSSProperties = {
  minHeight: '30px',
  minWidth: '11rem',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--color-border-strong)',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text-secondary)',
  boxShadow: 'none',
}

export const aiToolbarContextTriggerActiveStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-accent-emerald-soft) 16%, var(--color-surface-glass-soft))',
  color: 'var(--color-text-primary)',
}

export const aiToolbarContextTriggerLabelClusterStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  minWidth: 0,
  gap: '2px',
}

export const aiToolbarContextTriggerTitleStyle: CSSProperties = {
  color: 'inherit',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export const aiToolbarContextTriggerMetaStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  maxWidth: '11rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const aiComposerContextStripStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
  minWidth: 0,
  padding: '0 var(--space-xs)',
}

export const aiComposerContextStripLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export const aiComposerContextStripRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-xs)',
  minWidth: 0,
}

export const aiComposerContextStripRemoveStyle: CSSProperties = {
  minHeight: '24px',
  minWidth: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0 var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--color-border-strong)',
  background: 'color-mix(in srgb, var(--color-accent-emerald-soft) 18%, var(--color-surface-glass-soft))',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
}

export const aiComposerContextStripCurrentStyle: CSSProperties = {
  minHeight: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 var(--space-sm)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 78%, transparent)',
}

export const aiComposerContextStripValueStyle: CSSProperties = {
  color: 'inherit',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  maxWidth: '16rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const aiComposerSurfaceStyle: CSSProperties = {
  position: 'relative',
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

export const aiComposerActionActiveStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-accent-emerald-soft) 28%, var(--color-surface-glass-strong))',
  color: 'var(--color-text-primary)',
}

export const aiComposerContextMenuWrapStyle: CSSProperties = {
  position: 'absolute',
  top: 'var(--space-sm)',
  right: 'calc(var(--space-sm) + 34px + var(--gap-sm))',
  bottom: 'var(--space-sm)',
  width: 'min(24rem, calc(100% - 5rem))',
  display: 'flex',
  alignItems: 'flex-end',
  zIndex: 'var(--z-modal-body)',
}

export const aiComposerContextMenuStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxHeight: '100%',
  overflowY: 'auto',
  gap: 'var(--gap-xs)',
  padding: 'var(--space-md)',
  borderColor: 'var(--color-border-strong)',
  background: 'color-mix(in srgb, var(--color-canvas-elevated) 82%, transparent)',
  boxShadow: 'var(--shadow-glass-lg)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

export const aiComposerContextMenuHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
}

export const aiComposerContextSummaryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: 'var(--space-sm)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 82%, transparent)',
}

export const aiComposerContextSummaryRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr)',
  gap: 'var(--space-sm)',
  alignItems: 'start',
}

export const aiComposerContextSummaryLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export const aiComposerContextSummaryValueStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiComposerContextRepairNoticeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-sm)',
  padding: 'var(--space-sm)',
  border: '1px solid var(--color-accent-warning-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'color-mix(in srgb, var(--color-accent-warning-bg) 86%, transparent)',
}

export const aiComposerContextRepairNoticeTextStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export const aiComposerContextRepairNoticeActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  flexShrink: 0,
}

export const aiComposerContextQuickActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  flexWrap: 'wrap',
}

export const aiComposerContextQuickActionStyle: CSSProperties = {
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  borderColor: 'var(--color-border-strong)',
  background: 'var(--color-surface-glass-strong)',
  color: 'var(--color-text-primary)',
  boxShadow: 'none',
}

export const aiComposerContextMenuTitleStyle: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export const aiComposerContextMenuMetaStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family-mono)',
  fontSize: '12px',
  lineHeight: '16px',
  whiteSpace: 'pre-wrap',
}
