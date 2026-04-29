import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
import {
  DEFAULT_TERMINAL_CURSOR_BLINK,
  DEFAULT_TERMINAL_CURSOR_STYLE,
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
import { Button, Checkbox, Label, Select, Text } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'
import { terminalSettingsCopy } from '@/widgets/settings/terminal-settings-section-copy'

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
  const cursorBlinkInputId = 'terminal-cursor-blink'
  const { locale } = useAppLocale()
  const {
    decreaseFontSize,
    decreaseLineHeight,
    cursorBlink,
    cursorStyle,
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
    resetCursorBlink,
    resetCursorStyle,
    resetThemeMode,
    resetAllDefaults,
    scrollback,
    themeMode,
    decreaseScrollback,
    updateCursorBlink,
    updateCursorStyle,
    updateThemeMode,
  } = useTerminalPreferences()
  const copy = resolveLocalizedCopy(terminalSettingsCopy, locale)
  const canDecreaseFontSize = fontSize > MIN_TERMINAL_FONT_SIZE
  const canIncreaseFontSize = fontSize < MAX_TERMINAL_FONT_SIZE
  const canDecreaseLineHeight = lineHeight > MIN_TERMINAL_LINE_HEIGHT
  const canIncreaseLineHeight = lineHeight < MAX_TERMINAL_LINE_HEIGHT
  const canDecreaseScrollback = scrollback > MIN_TERMINAL_SCROLLBACK
  const canIncreaseScrollback = scrollback < MAX_TERMINAL_SCROLLBACK
  const isAtTerminalDefaults =
    fontSize === DEFAULT_TERMINAL_FONT_SIZE &&
    lineHeight === DEFAULT_TERMINAL_LINE_HEIGHT &&
    themeMode === DEFAULT_TERMINAL_THEME_MODE &&
    scrollback === DEFAULT_TERMINAL_SCROLLBACK &&
    cursorStyle === DEFAULT_TERMINAL_CURSOR_STYLE &&
    cursorBlink === DEFAULT_TERMINAL_CURSOR_BLINK

  return (
    <SectionCard description={copy.sectionDescription} title={copy.sectionTitle}>
      <ClearBox style={settingsShellListStyle}>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.resetTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.resetDescription}</Text>
          </ClearBox>
          <Button
            aria-label={copy.resetAllDefaultsAria}
            disabled={isLoading || isSaving || isAtTerminalDefaults}
            onClick={() => void resetAllDefaults()}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </Button>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.currentFontTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.currentFontDescription}</Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>{isLoading ? copy.loading : `${fontSize}px`}</ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.adjustSizeTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>
              {copy.adjustSizeDescription(
                MIN_TERMINAL_FONT_SIZE,
                MAX_TERMINAL_FONT_SIZE,
                DEFAULT_TERMINAL_FONT_SIZE,
              )}
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label={copy.decreaseFontSizeAria}
              disabled={isLoading || isSaving || !canDecreaseFontSize}
              onClick={() => void decreaseFontSize()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.resetFontSizeAria}
              disabled={isLoading || isSaving || fontSize === DEFAULT_TERMINAL_FONT_SIZE}
              onClick={() => void resetFontSize()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.increaseFontSizeAria}
              disabled={isLoading || isSaving || !canIncreaseFontSize}
              onClick={() => void increaseFontSize()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.themeModeTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.themeModeDescription}</Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Select
              aria-label={copy.terminalThemeModeAria}
              disabled={isLoading || isSaving}
              onChange={(event) => void updateThemeMode(event.currentTarget.value as 'adaptive' | 'contrast')}
              value={themeMode}
            >
              <option value="adaptive">{copy.themeModeAdaptive}</option>
              <option value="contrast">{copy.themeModeContrast}</option>
            </Select>
            <Button
              aria-label={copy.resetThemeModeAria}
              disabled={isLoading || isSaving || themeMode === DEFAULT_TERMINAL_THEME_MODE}
              onClick={() => void resetThemeMode()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.currentScrollbackTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.currentScrollbackDescription}</Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? copy.loading : `${scrollback} lines`}
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.adjustScrollbackTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>
              {copy.adjustScrollbackDescription(
                MIN_TERMINAL_SCROLLBACK,
                MAX_TERMINAL_SCROLLBACK,
                DEFAULT_TERMINAL_SCROLLBACK,
              )}
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label={copy.decreaseScrollbackAria}
              disabled={isLoading || isSaving || !canDecreaseScrollback}
              onClick={() => void decreaseScrollback()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.resetScrollbackAria}
              disabled={isLoading || isSaving || scrollback === DEFAULT_TERMINAL_SCROLLBACK}
              onClick={() => void resetScrollback()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.increaseScrollbackAria}
              disabled={isLoading || isSaving || !canIncreaseScrollback}
              onClick={() => void increaseScrollback()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.cursorStyleTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.cursorStyleDescription}</Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Select
              aria-label={copy.terminalCursorStyleAria}
              disabled={isLoading || isSaving}
              onChange={(event) =>
                void updateCursorStyle(event.currentTarget.value as 'block' | 'bar' | 'underline')
              }
              value={cursorStyle}
            >
              <option value="block">{copy.cursorStyleBlock}</option>
              <option value="bar">{copy.cursorStyleBar}</option>
              <option value="underline">{copy.cursorStyleUnderline}</option>
            </Select>
            <Button
              aria-label={copy.resetCursorStyleAria}
              disabled={isLoading || isSaving || cursorStyle === DEFAULT_TERMINAL_CURSOR_STYLE}
              onClick={() => void resetCursorStyle()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.cursorBlinkTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.cursorBlinkDescription}</Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
            <Label
              htmlFor={cursorBlinkInputId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}
            >
              <Checkbox
                checked={cursorBlink}
                id={cursorBlinkInputId}
                disabled={isLoading || isSaving}
                aria-label={copy.enableCursorBlinkAria}
                onChange={(event) => void updateCursorBlink(event.currentTarget.checked)}
              />
              <Text>{cursorBlink ? copy.cursorBlinkEnabled : copy.cursorBlinkDisabled}</Text>
            </Label>
            <Button
              aria-label={copy.resetCursorBlinkAria}
              disabled={isLoading || isSaving || cursorBlink === DEFAULT_TERMINAL_CURSOR_BLINK}
              onClick={() => void resetCursorBlink()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.currentLineHeightTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>{copy.currentLineHeightDescription}</Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? copy.loading : `${lineHeight.toFixed(2)}x`}
          </ClearBox>
        </ClearBox>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.adjustLineHeightTitle}</Text>
            <Text style={settingsShellMutedTextStyle}>
              {copy.adjustLineHeightDescription(
                MIN_TERMINAL_LINE_HEIGHT,
                MAX_TERMINAL_LINE_HEIGHT,
                DEFAULT_TERMINAL_LINE_HEIGHT,
              )}
            </Text>
          </ClearBox>
          <ClearBox style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gap-xs)' }}>
            <Button
              aria-label={copy.decreaseLineHeightAria}
              disabled={isLoading || isSaving || !canDecreaseLineHeight}
              onClick={() => void decreaseLineHeight()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.resetLineHeightAria}
              disabled={isLoading || isSaving || lineHeight === DEFAULT_TERMINAL_LINE_HEIGHT}
              onClick={() => void resetLineHeight()}
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.increaseLineHeightAria}
              disabled={isLoading || isSaving || !canIncreaseLineHeight}
              onClick={() => void increaseLineHeight()}
            >
              <Plus size={14} strokeWidth={1.8} />
            </Button>
          </ClearBox>
        </ClearBox>
      </ClearBox>
      <Text style={settingsShellMutedTextStyle}>{errorMessage ?? copy.defaultStateDescription}</Text>
    </SectionCard>
  )
}
