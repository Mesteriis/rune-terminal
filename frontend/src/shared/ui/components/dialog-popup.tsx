import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Box, Button, Text } from '@/shared/ui/primitives'
import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

type DialogPopupProps = {
  title: string
  description: string
  variant?: 'default' | 'settings'
  children?: ReactNode
  confirmLabel?: string
  dismissLabel?: string
  onConfirm?: () => void
  onDismiss: () => void
}

const dialogPopupStyle = {
  width: 'min(100%, var(--size-modal-width))',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
}

const settingsDialogPopupStyle = {
  width: '90vw',
  minWidth: '90vw',
  maxWidth: '90vw',
  height: '95vh',
  minHeight: '95vh',
  maxHeight: '95vh',
}

const dialogHeaderStyle = {
  ...resetBoxStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
}

const settingsDialogHeaderStyle = {
  ...dialogHeaderStyle,
  justifyContent: 'flex-end',
}

const dialogTitleStyle = {
  display: 'block',
  fontWeight: 600,
}

const dialogDescriptionStyle = {
  display: 'block',
  color: 'var(--color-text-secondary)',
}

const dialogActionsStyle = {
  ...resetBoxStyle,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
}

const dialogContentStyle = {
  ...resetBoxStyle,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  minHeight: 0,
}

const settingsDialogContentStyle = {
  flex: 1,
}

const settingsCloseButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
}

export function DialogPopup({
  title,
  description,
  variant = 'default',
  children,
  confirmLabel = 'Confirm',
  dismissLabel = 'Dismiss',
  onConfirm,
  onDismiss,
}: DialogPopupProps) {
  const isSettingsVariant = variant === 'settings'
  const shouldRenderActions = Boolean(onConfirm) || !isSettingsVariant

  return (
    <Box style={isSettingsVariant ? { ...dialogPopupStyle, ...settingsDialogPopupStyle } : dialogPopupStyle}>
      <Box style={isSettingsVariant ? settingsDialogHeaderStyle : dialogHeaderStyle}>
        {isSettingsVariant ? null : <Text style={dialogTitleStyle}>{title}</Text>}
        <Button
          aria-label={`Close ${title}`}
          onClick={onDismiss}
          style={isSettingsVariant ? settingsCloseButtonStyle : undefined}
        >
          {isSettingsVariant ? <X size={16} strokeWidth={1.75} /> : 'Close'}
        </Button>
      </Box>
      {isSettingsVariant ? null : <Text style={dialogDescriptionStyle}>{description}</Text>}
      {children ? (
        <Box
          style={
            isSettingsVariant ? { ...dialogContentStyle, ...settingsDialogContentStyle } : dialogContentStyle
          }
        >
          {children}
        </Box>
      ) : null}
      {shouldRenderActions ? (
        <Box style={dialogActionsStyle}>
          {onConfirm ? <Button onClick={onConfirm}>{confirmLabel}</Button> : null}
          {isSettingsVariant ? null : <Button onClick={onDismiss}>{dismissLabel}</Button>}
        </Box>
      ) : null}
    </Box>
  )
}
