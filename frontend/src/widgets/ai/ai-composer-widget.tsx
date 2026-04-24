import { useEffect, useId, useRef, useState } from 'react'

import { List, SendHorizontal } from 'lucide-react'

import type { AiContextWidgetOption } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton, SearchableMultiSelect, SwitcherControl } from '@/shared/ui/components'
import { Badge, Box, Select, Surface, Text, TextArea } from '@/shared/ui/primitives'

import {
  aiComposerActionActiveStyle,
  aiComposerActionRailStyle,
  aiComposerActionStyle,
  aiComposerContextMenuHeaderStyle,
  aiComposerContextMenuMetaStyle,
  aiComposerContextMenuStyle,
  aiComposerContextMenuTitleStyle,
  aiComposerContextMenuWrapStyle,
  aiComposerSurfaceStyle,
  aiComposerTextAreaStyle,
  aiToolbarChipStyle,
  aiToolbarControlsStyle,
  aiToolbarLabelStyle,
  aiToolbarModelSelectStyle,
  aiToolbarStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiComposerWidgetProps = {
  toolbarLabel: string
  activeTool: string
  availableModels?: string[]
  placeholder: string
  selectedModel?: string
  value?: string
  onModelChange?: (value: string) => void
  onValueChange?: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  submitDisabled?: boolean
  contextWidgetOptions?: AiContextWidgetOption[]
  selectedContextWidgetIDs?: string[]
  isWidgetContextEnabled?: boolean
  contextWidgetLoadError?: string | null
  onContextOptionsOpen?: () => void
  onSelectedContextWidgetIDsChange?: (value: string[]) => void
  onWidgetContextEnabledChange?: (value: boolean) => void
}

export function AiComposerWidget({
  activeTool,
  availableModels = [],
  disabled = false,
  onModelChange,
  onSubmit,
  onValueChange,
  placeholder,
  selectedModel,
  contextWidgetLoadError = null,
  contextWidgetOptions = [],
  isWidgetContextEnabled = true,
  onContextOptionsOpen,
  onSelectedContextWidgetIDsChange,
  onWidgetContextEnabledChange,
  selectedContextWidgetIDs = [],
  submitDisabled = false,
  toolbarLabel,
  value,
}: AiComposerWidgetProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const contextMenuId = useId()
  const contextMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const modelValue =
    selectedModel && availableModels.includes(selectedModel) ? selectedModel : (availableModels[0] ?? '')
  const selectedContextCount = selectedContextWidgetIDs.length

  useEffect(() => {
    if (!isContextMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!contextMenuWrapRef.current?.contains(event.target as Node)) {
        setIsContextMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsContextMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isContextMenuOpen])

  const handleToggleContextMenu = () => {
    setIsContextMenuOpen((currentValue) => {
      const nextValue = !currentValue
      if (nextValue) {
        onContextOptionsOpen?.()
      }
      return nextValue
    })
  }

  return (
    <RunaDomScopeProvider component="ai-composer-widget">
      <Box
        runaComponent="ai-composer-root"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}
      >
        <Surface runaComponent="ai-composer-toolbar" style={aiToolbarStyle}>
          <Text runaComponent="ai-composer-toolbar-label" style={aiToolbarLabelStyle}>
            {toolbarLabel}
          </Text>
          <Box style={aiToolbarControlsStyle}>
            {availableModels.length > 0 ? (
              <Select
                aria-label="AI model"
                disabled={disabled}
                onChange={(event) => onModelChange?.(event.currentTarget.value)}
                runaComponent="ai-composer-model-select"
                style={aiToolbarModelSelectStyle}
                value={modelValue}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            ) : null}
            <Badge runaComponent="ai-composer-toolbar-chip" style={aiToolbarChipStyle}>
              {activeTool}
            </Badge>
          </Box>
        </Surface>
        <Surface runaComponent="ai-composer-surface" style={aiComposerSurfaceStyle}>
          {isContextMenuOpen ? (
            <Box
              id={contextMenuId}
              ref={contextMenuWrapRef}
              runaComponent="ai-composer-context-menu-wrap"
              style={aiComposerContextMenuWrapStyle}
            >
              <Surface
                role="dialog"
                aria-label="Context widgets"
                runaComponent="ai-composer-context-menu"
                style={aiComposerContextMenuStyle}
              >
                <Box runaComponent="ai-composer-context-menu-header" style={aiComposerContextMenuHeaderStyle}>
                  <Text
                    runaComponent="ai-composer-context-menu-title"
                    style={aiComposerContextMenuTitleStyle}
                  >
                    Request context
                  </Text>
                  <Text runaComponent="ai-composer-context-menu-meta" style={aiComposerContextMenuMetaStyle}>
                    {selectedContextCount > 0
                      ? `${selectedContextCount} widget${selectedContextCount === 1 ? '' : 's'} selected`
                      : 'No widgets selected'}
                  </Text>
                </Box>
                <SwitcherControl
                  checked={isWidgetContextEnabled}
                  description="Include selected workspace widgets in the AI request context."
                  disabled={disabled}
                  label="Use widget context"
                  onChange={(event) => {
                    onWidgetContextEnabledChange?.(event.currentTarget.checked)
                  }}
                />
                {contextWidgetLoadError ? (
                  <Text runaComponent="ai-composer-context-menu-error" style={aiComposerContextMenuMetaStyle}>
                    {contextWidgetLoadError}
                  </Text>
                ) : null}
                <SearchableMultiSelect
                  label="Widgets"
                  onChange={onSelectedContextWidgetIDsChange ?? (() => {})}
                  options={contextWidgetOptions}
                  searchPlaceholder="Search widgets"
                  value={selectedContextWidgetIDs}
                />
              </Surface>
            </Box>
          ) : null}
          <TextArea
            disabled={disabled}
            onChange={(event) => {
              onValueChange?.(event.currentTarget.value)
            }}
            placeholder={placeholder}
            runaComponent="ai-composer-textarea"
            style={aiComposerTextAreaStyle}
            value={value}
          />
          <Box runaComponent="ai-composer-action-rail" style={aiComposerActionRailStyle}>
            <IconButton
              aria-label="Composer options"
              aria-controls={isContextMenuOpen ? contextMenuId : undefined}
              aria-expanded={isContextMenuOpen}
              disabled={disabled}
              onClick={handleToggleContextMenu}
              runaComponent="ai-composer-options"
              style={{
                ...aiComposerActionStyle,
                ...(isContextMenuOpen || (isWidgetContextEnabled && selectedContextCount > 0)
                  ? aiComposerActionActiveStyle
                  : {}),
              }}
            >
              <List size={18} strokeWidth={1.8} />
            </IconButton>
            <IconButton
              aria-label="Send prompt"
              disabled={submitDisabled}
              onClick={() => {
                onSubmit?.()
              }}
              runaComponent="ai-composer-send"
              style={aiComposerActionStyle}
            >
              <SendHorizontal size={18} strokeWidth={1.8} />
            </IconButton>
          </Box>
        </Surface>
      </Box>
    </RunaDomScopeProvider>
  )
}
