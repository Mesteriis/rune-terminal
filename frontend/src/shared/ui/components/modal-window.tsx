import { Box, Button, Text } from '../primitives'

type ModalWindowProps = {
  title: string
  description: string
  onClose: () => void
}

const modalWindowStyle = {
  width: 'min(100%, var(--size-modal-width))',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
}

const modalHeaderStyle = {
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

const modalTitleStyle = {
  display: 'block',
  fontWeight: 600,
}

const modalDescriptionStyle = {
  display: 'block',
  color: 'var(--color-text-secondary)',
}

const modalActionsStyle = {
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

export function ModalWindow({ title, description, onClose }: ModalWindowProps) {
  return (
    <Box style={modalWindowStyle}>
      <Box style={modalHeaderStyle}>
        <Text style={modalTitleStyle}>{title}</Text>
        <Button aria-label={`Close ${title}`} onClick={onClose}>
          Close
        </Button>
      </Box>
      <Text style={modalDescriptionStyle}>{description}</Text>
      <Box style={modalActionsStyle}>
        <Button onClick={onClose}>Dismiss</Button>
      </Box>
    </Box>
  )
}
