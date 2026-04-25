import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  DEFAULT_TERMINAL_SCROLLBACK,
  DEFAULT_TERMINAL_THEME_MODE,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_LINE_HEIGHT,
  MAX_TERMINAL_SCROLLBACK,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_LINE_HEIGHT,
  MIN_TERMINAL_SCROLLBACK,
  useTerminalPreferences,
} from '@/features/terminal/model/use-terminal-preferences'
import { ClearBox } from '@/shared/ui/components'
import { Button, Select, Text } from '@/shared/ui/primitives'
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
  const {
    decreaseFontSize,
    decreaseLineHeight,
    errorMessage,
    fontSize,
    increaseFontSize,
    increaseLineHeight,
    increaseScrollback,
    isLoading,
    isSaving,
    lineHeight,
    resetScrollback,
    resetFontSize,
    resetLineHeight,
    resetThemeMode,
    scrollback,
    themeMode,
    decreaseScrollback,
    updateThemeMode,
  } = useTerminalPreferences()
  const canDecreaseFontSize = fontSize > MIN_TERMINAL_FONT_SIZE
  const canIncreaseFontSize = fontSize < MAX_TERMINAL_FONT_SIZE
  const canDecreaseLineHeight = lineHeight > MIN_TERMINAL_LINE_HEIGHT
  const canIncreaseLineHeight = lineHeight < MAX_TERMINAL_LINE_HEIGHT
  const canDecreaseScrollback = scrollback > MIN_TERMINAL_SCROLLBACK
  const canIncreaseScrollback = scrollback < MAX_TERMINAL_SCROLLBACK

  return (
    <SectionCard
      description="Это runtime-owned terminal typography. Она хранится в backend state и применяется ко всем живым terminal widgets в текущем shell."
      title="Terminal typography"
    >
      <ClearBox style={settingsShellListStyle}>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Current terminal font size</Text>
            <Text style={settingsShellMutedTextStyle}>
              Изменение применяется сразу ко всем terminal widgets и сохраняется в runtime state.
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>{isLoading ? 'Loading…' : `${fontSize}px`}</ClearBox>
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
              disabled={isLoading || isSaving || !canDecreaseFontSize}
              onClick={() => void decreaseFontSize()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Reset terminal font size"
              disabled={isLoading || isSaving || fontSize === DEFAULT_TERMINAL_FONT_SIZE}
              onClick={() => void resetFontSize()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Increase terminal font size"
              disabled={isLoading || isSaving || !canIncreaseFontSize}
              onClick={() => void increaseFontSize()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Terminal theme mode</Text>
            <Text style={settingsShellMutedTextStyle}>
              `adaptive` следует текущему shell chrome, а `contrast` принудительно включает более контрастную
              terminal palette.
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Select
              aria-label="Terminal theme mode"
              disabled={isLoading || isSaving}
              onChange={(event) => void updateThemeMode(event.currentTarget.value as 'adaptive' | 'contrast')}
              value={themeMode}
            >
              <option value="adaptive">Adaptive</option>
              <option value="contrast">Contrast</option>
            </Select>
            <Button
              aria-label="Reset terminal theme mode"
              disabled={isLoading || isSaving || themeMode === DEFAULT_TERMINAL_THEME_MODE}
              onClick={() => void resetThemeMode()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Current scrollback</Text>
            <Text style={settingsShellMutedTextStyle}>
              Scrollback ограничивает объём буфера в xterm и теперь тоже идёт через runtime-owned contract.
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? 'Loading…' : `${scrollback} lines`}
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Adjust scrollback</Text>
            <Text style={settingsShellMutedTextStyle}>
              Диапазон {MIN_TERMINAL_SCROLLBACK}–{MAX_TERMINAL_SCROLLBACK} lines, default{' '}
              {DEFAULT_TERMINAL_SCROLLBACK}.
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label="Decrease terminal scrollback"
              disabled={isLoading || isSaving || !canDecreaseScrollback}
              onClick={() => void decreaseScrollback()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Reset terminal scrollback"
              disabled={isLoading || isSaving || scrollback === DEFAULT_TERMINAL_SCROLLBACK}
              onClick={() => void resetScrollback()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Increase terminal scrollback"
              disabled={isLoading || isSaving || !canIncreaseScrollback}
              onClick={() => void increaseScrollback()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Current line height</Text>
            <Text style={settingsShellMutedTextStyle}>
              Line height управляет вертикальной плотностью xterm и тоже применяется сразу ко всем живым
              terminal widgets.
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? 'Loading…' : `${lineHeight.toFixed(2)}x`}
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Adjust line height</Text>
            <Text style={settingsShellMutedTextStyle}>
              Диапазон {MIN_TERMINAL_LINE_HEIGHT.toFixed(2)}x–{MAX_TERMINAL_LINE_HEIGHT.toFixed(2)}x, default{' '}
              {DEFAULT_TERMINAL_LINE_HEIGHT.toFixed(2)}x.
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label="Decrease terminal line height"
              disabled={isLoading || isSaving || !canDecreaseLineHeight}
              onClick={() => void decreaseLineHeight()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Reset terminal line height"
              disabled={isLoading || isSaving || lineHeight === DEFAULT_TERMINAL_LINE_HEIGHT}
              onClick={() => void resetLineHeight()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Increase terminal line height"
              disabled={isLoading || isSaving || !canIncreaseLineHeight}
              onClick={() => void increaseLineHeight()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
      </ClearBox>
      <Text style={settingsShellMutedTextStyle}>
        {errorMessage ?? 'These terminal settings are now backed by the shared runtime contract.'}
      </Text>
    </SectionCard>
  )
}
