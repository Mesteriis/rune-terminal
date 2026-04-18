import { Box, Button, Text } from '../primitives'

type DialogPopupProps = {
  title: string
  description: string
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

const dialogHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-sm)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
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
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function DialogPopup({
  title,
  description,
  confirmLabel = 'Confirm',
  dismissLabel = 'Dismiss',
  onConfirm,
  onDismiss,
}: DialogPopupProps) {
  return (
    <Box style={dialogPopupStyle}>
      <Box style={dialogHeaderStyle}>
        <Text style={dialogTitleStyle}>{title}</Text>
        <Button aria-label={`Close ${title}`} onClick={onDismiss}>
          Close
        </Button>
      </Box>
      <Text style={dialogDescriptionStyle}>{description}</Text>
      <Box style={dialogActionsStyle}>
        {onConfirm ? <Button onClick={onConfirm}>{confirmLabel}</Button> : null}
        <Button onClick={onDismiss}>{dismissLabel}</Button>
      </Box>
    </Box>
  )
}
