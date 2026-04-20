import { useRunaDomIdentity, useRunaDomScope } from '@/shared/ui/dom-id'
import { Box, Checkbox, Label, Text, type CheckboxProps } from '@/shared/ui/primitives'
import { resetBoxStyle } from '@/shared/ui/components/reset-box-style'

export type SwitcherControlProps = Omit<CheckboxProps, 'type'> & {
  label: string
  description?: string
}

const switcherLabelStyle = {
  width: '100%',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const switcherTextStyle = {
  ...resetBoxStyle,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

const switcherDescriptionStyle = {
  color: 'var(--color-text-secondary)',
}

const hiddenCheckboxStyle = {
  position: 'absolute' as const,
  opacity: 0,
  pointerEvents: 'none' as const,
}

const trackBaseStyle = {
  width: '40px',
  minWidth: '40px',
  height: '22px',
  display: 'flex',
  alignItems: 'center',
  padding: '2px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '999px',
  background: 'var(--color-surface-glass-soft)',
  boxShadow: 'none',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
}

const thumbBaseStyle = {
  width: '16px',
  height: '16px',
  borderRadius: '999px',
  background: 'var(--color-text-primary)',
}

export function SwitcherControl({
  id,
  label,
  description,
  checked = false,
  ...checkboxProps
}: SwitcherControlProps) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(`${scope.component}-switcher-input`, id)
  const inputId = identity.id

  return (
    <Label htmlFor={inputId} runaComponent={`${scope.component}-switcher-label`} style={switcherLabelStyle}>
      <Box runaComponent={`${scope.component}-switcher-copy`} style={switcherTextStyle}>
        <Text runaComponent={`${scope.component}-switcher-text`}>{label}</Text>
        {description ? (
          <Text runaComponent={`${scope.component}-switcher-description`} style={switcherDescriptionStyle}>
            {description}
          </Text>
        ) : null}
      </Box>
      <Box
        runaComponent={`${scope.component}-switcher-track`}
        style={{
          ...trackBaseStyle,
          justifyContent: checked ? 'flex-end' : 'flex-start',
          background: checked ? 'var(--color-surface-emerald)' : trackBaseStyle.background,
        }}
      >
        <Box runaComponent={`${scope.component}-switcher-thumb`} style={thumbBaseStyle} />
      </Box>
      <Checkbox
        {...checkboxProps}
        checked={checked}
        id={inputId}
        runaComponent={`${scope.component}-switcher-input`}
        style={hiddenCheckboxStyle}
      />
    </Label>
  )
}
