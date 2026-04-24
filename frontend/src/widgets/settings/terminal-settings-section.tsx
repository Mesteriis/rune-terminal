import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_FONT_SIZE,
  useTerminalPreferences,
} from '@/features/terminal/model/use-terminal-preferences'
import { ClearBox } from '@/shared/ui/components'
import { Button, Text } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </ClearBox>
      {children}
    </ClearBox>
  )
}

export function TerminalSettingsSection() {
  const { decreaseFontSize, fontSize, increaseFontSize, resetFontSize } = useTerminalPreferences()
  const canDecreaseFontSize = fontSize > MIN_TERMINAL_FONT_SIZE
  const canIncreaseFontSize = fontSize < MAX_TERMINAL_FONT_SIZE

  return (
    <SectionCard
      description="Это frontend-owned terminal preference. Оно применяется к живому xterm surface и хранится локально, пока отдельный backend terminal settings contract не введён."
      title="Terminal font size"
    >
      <ClearBox style={settingsShellListStyle}>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Current terminal font size</Text>
            <Text style={settingsShellMutedTextStyle}>
              Изменение применяется сразу ко всем terminal widgets в текущем shell UI.
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>{fontSize}px</ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Adjust size</Text>
            <Text style={settingsShellMutedTextStyle}>
              Диапазон {MIN_TERMINAL_FONT_SIZE}px–{MAX_TERMINAL_FONT_SIZE}px, default{' '}
              {DEFAULT_TERMINAL_FONT_SIZE}px.
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label="Decrease terminal font size"
              disabled={!canDecreaseFontSize}
              onClick={decreaseFontSize}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Reset terminal font size"
              disabled={fontSize === DEFAULT_TERMINAL_FONT_SIZE}
              onClick={resetFontSize}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Increase terminal font size"
              disabled={!canIncreaseFontSize}
              onClick={increaseFontSize}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
      </ClearBox>
      <Text style={settingsShellMutedTextStyle}>
        This preference is stored in local UI state and does not extend the backend terminal runtime contract.
      </Text>
    </SectionCard>
  )
}
