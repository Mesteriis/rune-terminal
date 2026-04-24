import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { ChevronDown, List, SendHorizontal, X } from 'lucide-react'

import type {
  AiContextWidgetOption,
  AiProviderOption,
  AiComposerSubmitMode,
} from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton, SearchableMultiSelect, SwitcherControl } from '@/shared/ui/components'
import { Badge, Box, Button, Select, Surface, Text, TextArea } from '@/shared/ui/primitives'

import {
  aiComposerActionRailStyle,
  aiComposerActionStyle,
  aiComposerContextMenuHeaderStyle,
  aiComposerContextMenuMetaStyle,
  aiComposerContextQuickActionStyle,
  aiComposerContextQuickActionsStyle,
  aiComposerContextStripCurrentStyle,
  aiComposerContextStripLabelStyle,
  aiComposerContextStripRemoveStyle,
  aiComposerContextStripRowStyle,
  aiComposerContextStripStyle,
  aiComposerContextStripValueStyle,
  aiComposerContextSummaryLabelStyle,
  aiComposerContextSummaryListStyle,
  aiComposerContextSummaryRowStyle,
  aiComposerContextSummaryValueStyle,
  aiComposerContextMenuStyle,
  aiComposerContextMenuTitleStyle,
  aiComposerContextMenuWrapStyle,
  aiComposerSurfaceStyle,
  aiComposerTextAreaStyle,
  aiToolbarChipStyle,
  aiToolbarControlStripStyle,
  aiToolbarControlsStyle,
  aiToolbarContextTriggerActiveStyle,
  aiToolbarContextTriggerLabelClusterStyle,
  aiToolbarContextTriggerMetaStyle,
  aiToolbarContextTriggerStyle,
  aiToolbarContextTriggerTitleStyle,
  aiToolbarFieldLabelStyle,
  aiToolbarFieldStackStyle,
  aiToolbarLabelStyle,
  aiToolbarMetaRowStyle,
  aiToolbarModelSelectStyle,
  aiToolbarProviderSelectStyle,
  aiToolbarStatusClusterStyle,
  aiToolbarStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiComposerWidgetProps = {
  toolbarLabel: string
  activeTool: string
  availableModels?: string[]
  availableProviders?: AiProviderOption[]
  placeholder: string
  selectedProviderID?: string
  selectedModel?: string
  onProviderChange?: (value: string) => void
  value?: string
  onModelChange?: (value: string) => void
  onValueChange?: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  submitDisabled?: boolean
  contextWidgetOptions?: AiContextWidgetOption[]
  activeContextWidgetID?: string
  activeContextWidgetOption?: AiContextWidgetOption | null
  selectedContextWidgetIDs?: string[]
  isWidgetContextEnabled?: boolean
  contextWidgetLoadError?: string | null
  onContextOptionsOpen?: () => void
  onContextUseCurrentWidget?: () => void
  onContextOnlyUseCurrentWidget?: () => void
  onSelectedContextWidgetIDsChange?: (value: string[]) => void
  onWidgetContextEnabledChange?: (value: boolean) => void
  submitMode?: AiComposerSubmitMode
}

export function AiComposerWidget({
  activeTool,
  availableModels = [],
  availableProviders = [],
  disabled = false,
  onModelChange,
  onProviderChange,
  onSubmit,
  onValueChange,
  placeholder,
  selectedProviderID,
  selectedModel,
  activeContextWidgetID,
  activeContextWidgetOption = null,
  contextWidgetLoadError = null,
  contextWidgetOptions = [],
  isWidgetContextEnabled = true,
  onContextOptionsOpen,
  onContextUseCurrentWidget,
  onContextOnlyUseCurrentWidget,
  onSelectedContextWidgetIDsChange,
  onWidgetContextEnabledChange,
  selectedContextWidgetIDs = [],
  submitMode = 'enter-sends',
  submitDisabled = false,
  toolbarLabel,
  value,
}: AiComposerWidgetProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const contextMenuId = useId()
  const contextMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const modelValue =
    selectedModel && availableModels.includes(selectedModel) ? selectedModel : (availableModels[0] ?? '')
  const providerValue =
    selectedProviderID && availableProviders.some((provider) => provider.value === selectedProviderID)
      ? selectedProviderID
      : (availableProviders[0]?.value ?? '')
  const selectedContextCount = selectedContextWidgetIDs.length
  const selectedContextOptions = selectedContextWidgetIDs
    .map((widgetID) => contextWidgetOptions.find((option) => option.value === widgetID) ?? null)
    .filter((option): option is AiContextWidgetOption => option != null)
  const contextSummaryPrimary = !isWidgetContextEnabled
    ? 'Context off'
    : selectedContextCount === 0
      ? (activeContextWidgetOption?.title ?? 'Context widgets')
      : selectedContextCount === 1
        ? (selectedContextOptions[0]?.title ?? '1 widget')
        : `${selectedContextCount} widgets`
  const contextSummarySecondary = !isWidgetContextEnabled
    ? 'Excluded from request'
    : selectedContextCount === 0
      ? (activeContextWidgetOption?.meta ?? 'Use current widget or pick specific widgets')
      : selectedContextCount === 1
        ? (selectedContextOptions[0]?.meta ?? 'Selected for this request')
        : `${selectedContextOptions
            .slice(0, 2)
            .map((option) => option.title ?? option.label)
            .join(', ')}${selectedContextCount > 2 ? ` +${selectedContextCount - 2}` : ''}`
  const isCurrentContextWidgetSelected =
    activeContextWidgetID != null && selectedContextWidgetIDs.includes(activeContextWidgetID)
  const showCurrentContextStrip =
    isWidgetContextEnabled && selectedContextCount === 0 && activeContextWidgetOption != null

  const handleRemoveContextWidget = (widgetID: string) => {
    onSelectedContextWidgetIDsChange?.(
      selectedContextWidgetIDs.filter((selectedWidgetID) => selectedWidgetID !== widgetID),
    )
  }

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

  const handleTextAreaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled || event.nativeEvent.isComposing) {
      return
    }

    if (submitMode === 'enter-sends') {
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        if (!submitDisabled) {
          onSubmit?.()
        }
      }
      return
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.altKey) {
      event.preventDefault()
      if (!submitDisabled) {
        onSubmit?.()
      }
    }
  }

  return (
    <RunaDomScopeProvider component="ai-composer-widget">
      <Box
        runaComponent="ai-composer-root"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}
      >
        <Surface runaComponent="ai-composer-toolbar" style={aiToolbarStyle}>
          <Box runaComponent="ai-composer-toolbar-meta-row" style={aiToolbarMetaRowStyle}>
            <Text runaComponent="ai-composer-toolbar-label" style={aiToolbarLabelStyle}>
              {toolbarLabel}
            </Text>
            <Box runaComponent="ai-composer-toolbar-status-cluster" style={aiToolbarStatusClusterStyle}>
              <Badge runaComponent="ai-composer-toolbar-chip" style={aiToolbarChipStyle}>
                {activeTool}
              </Badge>
            </Box>
          </Box>
          <Box runaComponent="ai-composer-toolbar-control-strip" style={aiToolbarControlStripStyle}>
            <Box style={aiToolbarControlsStyle}>
              {availableProviders.length > 0 ? (
                <Box runaComponent="ai-composer-provider-stack" style={aiToolbarFieldStackStyle}>
                  <Text style={aiToolbarFieldLabelStyle}>Source</Text>
                  <Select
                    aria-label="AI provider"
                    disabled={disabled}
                    onChange={(event) => onProviderChange?.(event.currentTarget.value)}
                    runaComponent="ai-composer-provider-select"
                    style={aiToolbarProviderSelectStyle}
                    value={providerValue}
                  >
                    {availableProviders.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                </Box>
              ) : null}
              {availableModels.length > 0 ? (
                <Box runaComponent="ai-composer-model-stack" style={aiToolbarFieldStackStyle}>
                  <Text style={aiToolbarFieldLabelStyle}>Model</Text>
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
                </Box>
              ) : null}
              <Box runaComponent="ai-composer-context-stack" style={aiToolbarFieldStackStyle}>
                <Text style={aiToolbarFieldLabelStyle}>Context</Text>
                <Button
                  aria-controls={isContextMenuOpen ? contextMenuId : undefined}
                  aria-expanded={isContextMenuOpen}
                  aria-label="Composer options"
                  disabled={disabled}
                  onClick={handleToggleContextMenu}
                  runaComponent="ai-composer-context-trigger"
                  style={{
                    ...aiToolbarContextTriggerStyle,
                    ...(isContextMenuOpen || (isWidgetContextEnabled && selectedContextCount > 0)
                      ? aiToolbarContextTriggerActiveStyle
                      : {}),
                  }}
                >
                  <Box style={aiToolbarContextTriggerLabelClusterStyle}>
                    <Text style={aiToolbarContextTriggerTitleStyle}>Context</Text>
                    <Text style={aiToolbarContextTriggerMetaStyle}>{contextSummaryPrimary}</Text>
                  </Box>
                  <ChevronDown size={14} strokeWidth={1.8} />
                </Button>
              </Box>
            </Box>
          </Box>
        </Surface>
        {isWidgetContextEnabled && (selectedContextCount > 0 || showCurrentContextStrip) ? (
          <Box runaComponent="ai-composer-context-strip" style={aiComposerContextStripStyle}>
            <Text runaComponent="ai-composer-context-strip-label" style={aiComposerContextStripLabelStyle}>
              Request context
            </Text>
            <Box runaComponent="ai-composer-context-strip-row" style={aiComposerContextStripRowStyle}>
              {selectedContextOptions.map((option) => (
                <Button
                  key={option.value}
                  aria-label={`Remove ${option.title ?? option.label} from request context`}
                  onClick={() => handleRemoveContextWidget(option.value)}
                  runaComponent="ai-composer-context-strip-chip"
                  style={aiComposerContextStripRemoveStyle}
                >
                  <Text style={aiComposerContextStripValueStyle}>{option.title ?? option.label}</Text>
                  <X size={12} strokeWidth={1.8} />
                </Button>
              ))}
              {showCurrentContextStrip ? (
                <Box
                  runaComponent="ai-composer-context-strip-current"
                  style={aiComposerContextStripCurrentStyle}
                >
                  <Text style={aiComposerContextStripValueStyle}>
                    Current: {activeContextWidgetOption.title ?? activeContextWidgetOption.label}
                  </Text>
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : null}
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
                <Box style={aiComposerContextSummaryListStyle}>
                  <Box style={aiComposerContextSummaryRowStyle}>
                    <Text style={aiComposerContextSummaryLabelStyle}>Current</Text>
                    <Text style={aiComposerContextSummaryValueStyle}>
                      {activeContextWidgetOption?.title ?? 'No active widget'}
                      {activeContextWidgetOption?.meta ? ` · ${activeContextWidgetOption.meta}` : ''}
                    </Text>
                  </Box>
                  <Box style={aiComposerContextSummaryRowStyle}>
                    <Text style={aiComposerContextSummaryLabelStyle}>Selected</Text>
                    <Text style={aiComposerContextSummaryValueStyle}>{contextSummarySecondary}</Text>
                  </Box>
                </Box>
                <Box style={aiComposerContextQuickActionsStyle}>
                  <Button
                    disabled={disabled || !activeContextWidgetOption || isCurrentContextWidgetSelected}
                    onClick={() => onContextUseCurrentWidget?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    Use current
                  </Button>
                  <Button
                    disabled={disabled || !activeContextWidgetOption}
                    onClick={() => onContextOnlyUseCurrentWidget?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    Only current
                  </Button>
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
            onKeyDown={handleTextAreaKeyDown}
            placeholder={placeholder}
            runaComponent="ai-composer-textarea"
            style={aiComposerTextAreaStyle}
            value={value}
          />
          <Box runaComponent="ai-composer-action-rail" style={aiComposerActionRailStyle}>
            <Badge
              runaComponent="ai-composer-context-badge"
              style={{
                ...aiToolbarChipStyle,
                alignSelf: 'flex-start',
                minWidth: 'auto',
                background:
                  isWidgetContextEnabled && selectedContextCount > 0
                    ? aiToolbarChipStyle.background
                    : 'var(--color-surface-glass-strong)',
                color:
                  isWidgetContextEnabled && selectedContextCount > 0
                    ? aiToolbarChipStyle.color
                    : 'var(--color-text-secondary)',
              }}
            >
              <List size={12} strokeWidth={2} />
              {isWidgetContextEnabled ? `${selectedContextCount || 0} ctx` : 'ctx off'}
            </Badge>
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
