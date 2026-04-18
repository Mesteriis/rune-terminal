import { Box, Button, Text } from '../primitives'

type NotifyTone = 'default' | 'success' | 'warning'

type NotifyProps = {
  title: string
  message: string
  tone?: NotifyTone
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
}

const notifyStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

const notifyHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const notifyTitleStyle = {
  display: 'block',
  fontWeight: 600,
}

const notifyMessageStyle = {
  display: 'block',
  color: 'var(--color-text-secondary)',
}

const notifyActionsStyle = {
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

function getToneStyle(tone: NotifyTone) {
  switch (tone) {
    case 'success':
      return {
        borderColor: 'var(--color-accent-emerald-strong)',
      }
    case 'warning':
      return {
        borderColor: 'var(--color-accent-cold-tea)',
      }
    default:
      return {
        borderColor: 'var(--color-border-strong)',
      }
  }
}

export function Notify({
  title,
  message,
  tone = 'default',
  actionLabel,
  onAction,
  onDismiss,
}: NotifyProps) {
  return (
    <Box style={{ ...notifyStyle, ...getToneStyle(tone) }}>
      <Box style={notifyHeaderStyle}>
        <Text style={notifyTitleStyle}>{title}</Text>
        {onDismiss ? (
          <Button aria-label={`Dismiss ${title}`} onClick={onDismiss}>
            Close
          </Button>
        ) : null}
      </Box>
      <Text style={notifyMessageStyle}>{message}</Text>
      {actionLabel && onAction ? (
        <Box style={notifyActionsStyle}>
          <Button onClick={onAction}>{actionLabel}</Button>
        </Box>
      ) : null}
    </Box>
  )
}
