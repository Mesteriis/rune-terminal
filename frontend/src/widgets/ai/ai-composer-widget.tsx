import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import {
  Bot,
  ChevronDown,
  Cpu,
  List,
  PanelsTopLeft,
  SendHorizontal,
  Shield,
  SlidersHorizontal,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'

import type {
  AiAgentSelectionOption,
  AiComposerAttachmentReference,
  AiComposerSubmitMode,
  AiContextWidgetOption,
  AiProviderOption,
} from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { ClearBox, IconButton, SearchableMultiSelect, SwitcherControl } from '@/shared/ui/components'
import { Badge, Box, Button, Select, Surface, Text, TextArea } from '@/shared/ui/primitives'

import {
  aiComposerActionRailStyle,
  aiComposerActionStyle,
  aiComposerContextMenuHeaderStyle,
  aiComposerContextMenuMetaStyle,
  aiComposerContextRepairNoticeActionsStyle,
  aiComposerContextRepairNoticeStyle,
  aiComposerContextRepairNoticeTextStyle,
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
  aiComposerSecondaryMenuControlStackStyle,
  aiComposerSecondaryMenuHeaderStyle,
  aiComposerSecondaryMenuMetaStyle,
  aiComposerSecondaryMenuStyle,
  aiComposerSecondaryMenuTitleStyle,
  aiComposerSecondaryMenuWrapStyle,
  aiComposerSurfaceStyle,
  aiComposerTextAreaStyle,
  aiToolbarChipStyle,
  aiToolbarControlStripStyle,
  aiToolbarControlsStyle,
  aiToolbarContextTriggerActiveStyle,
  aiToolbarContextTriggerLabelClusterStyle,
  aiToolbarContextTriggerMetaStyle,
  aiToolbarContextTriggerStyle,
  aiToolbarFieldIconStyle,
  aiToolbarFieldInlineStyle,
  aiToolbarFieldStackStyle,
  aiToolbarModelSelectStyle,
  aiToolbarProviderSelectStyle,
  aiToolbarStyle,
  aiToolbarTuneTriggerMetaStyle,
  aiToolbarTuneTriggerStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiComposerWidgetProps = {
  toolbarLabel: string
  activeTool: string
  availableModels?: string[]
  availableProviders?: AiProviderOption[]
  availableProfiles?: AiAgentSelectionOption[]
  availableRoles?: AiAgentSelectionOption[]
  availableModes?: AiAgentSelectionOption[]
  attachments?: AiComposerAttachmentReference[]
  recentAttachments?: AiComposerAttachmentReference[]
  placeholder: string
  selectedProviderID?: string
  selectedModel?: string
  selectedProfileID?: string
  selectedRoleID?: string
  selectedModeID?: string
  onProfileChange?: (value: string) => void
  onRoleChange?: (value: string) => void
  onModeChange?: (value: string) => void
  onProviderChange?: (value: string) => void
  value?: string
  onModelChange?: (value: string) => void
  onValueChange?: (value: string) => void
  onCancelSubmit?: () => void
  onRemoveAttachment?: (attachmentID: string) => void
  onReuseRecentAttachment?: (attachment: AiComposerAttachmentReference) => void
  onDeleteStoredAttachment?: (attachmentID: string) => void
  onSubmit?: () => void
  disabled?: boolean
  isSubmitting?: boolean
  isAttachmentLibraryPending?: boolean
  submitDisabled?: boolean
  contextWidgetOptions?: AiContextWidgetOption[]
  activeContextWidgetID?: string
  activeContextWidgetOption?: AiContextWidgetOption | null
  selectedContextWidgetIDs?: string[]
  isWidgetContextEnabled?: boolean
  contextWidgetLoadError?: string | null
  missingContextWidgetCount?: number
  onContextOptionsOpen?: () => void
  onContextUseCurrentWidget?: () => void
  onContextOnlyUseCurrentWidget?: () => void
  onContextUseAllWidgets?: () => void
  onContextUseDefault?: () => void
  onRepairMissingContextWidgets?: () => void
  onSelectedContextWidgetIDsChange?: (value: string[]) => void
  onWidgetContextEnabledChange?: (value: boolean) => void
  submitMode?: AiComposerSubmitMode
}

export function AiComposerWidget({
  availableModels = [],
  availableModes = [],
  availableProfiles = [],
  availableProviders = [],
  availableRoles = [],
  attachments = [],
  recentAttachments = [],
  disabled = false,
  isSubmitting = false,
  isAttachmentLibraryPending = false,
  onModelChange,
  onModeChange,
  onProfileChange,
  onProviderChange,
  onRoleChange,
  onCancelSubmit,
  onRemoveAttachment,
  onReuseRecentAttachment,
  onDeleteStoredAttachment,
  onSubmit,
  onValueChange,
  placeholder,
  selectedProviderID,
  selectedModel,
  selectedModeID,
  selectedProfileID,
  selectedRoleID,
  activeContextWidgetID,
  activeContextWidgetOption = null,
  contextWidgetLoadError = null,
  contextWidgetOptions = [],
  isWidgetContextEnabled = true,
  missingContextWidgetCount = 0,
  onContextOptionsOpen,
  onContextUseCurrentWidget,
  onContextOnlyUseCurrentWidget,
  onContextUseAllWidgets,
  onContextUseDefault,
  onRepairMissingContextWidgets,
  onSelectedContextWidgetIDsChange,
  onWidgetContextEnabledChange,
  selectedContextWidgetIDs = [],
  submitMode = 'enter-sends',
  submitDisabled = false,
  value,
}: AiComposerWidgetProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [isTuneMenuOpen, setIsTuneMenuOpen] = useState(false)
  const contextMenuId = useId()
  const tuneMenuId = useId()
  const contextMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const tuneMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const modelValue =
    selectedModel && availableModels.includes(selectedModel) ? selectedModel : (availableModels[0] ?? '')
  const providerValue =
    selectedProviderID && availableProviders.some((provider) => provider.value === selectedProviderID)
      ? selectedProviderID
      : (availableProviders[0]?.value ?? '')
  const profileValue =
    selectedProfileID && availableProfiles.some((profile) => profile.value === selectedProfileID)
      ? selectedProfileID
      : (availableProfiles[0]?.value ?? '')
  const roleValue =
    selectedRoleID && availableRoles.some((role) => role.value === selectedRoleID)
      ? selectedRoleID
      : (availableRoles[0]?.value ?? '')
  const modeValue =
    selectedModeID && availableModes.some((mode) => mode.value === selectedModeID)
      ? selectedModeID
      : (availableModes[0]?.value ?? '')
  const selectedContextCount = selectedContextWidgetIDs.length
  const hasAttachments = attachments.length > 0
  const hasRecentAttachments = recentAttachments.length > 0
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
  const allContextWidgetIDs = contextWidgetOptions.map((option) => option.value)
  const areAllWidgetsSelected =
    contextWidgetOptions.length > 0 &&
    allContextWidgetIDs.every((widgetID) => selectedContextWidgetIDs.includes(widgetID)) &&
    selectedContextWidgetIDs.length === contextWidgetOptions.length

  const handleRemoveContextWidget = (widgetID: string) => {
    onSelectedContextWidgetIDsChange?.(
      selectedContextWidgetIDs.filter((selectedWidgetID) => selectedWidgetID !== widgetID),
    )
  }

  useEffect(() => {
    if (!isContextMenuOpen && !isTuneMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node
      const isInsideContextMenu = contextMenuWrapRef.current?.contains(targetNode) ?? false
      const isInsideTuneMenu = tuneMenuWrapRef.current?.contains(targetNode) ?? false

      if (!isInsideContextMenu && !isInsideTuneMenu) {
        setIsContextMenuOpen(false)
        setIsTuneMenuOpen(false)
      }
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsContextMenuOpen(false)
        setIsTuneMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isContextMenuOpen, isTuneMenuOpen])

  const handleToggleContextMenu = () => {
    setIsContextMenuOpen((currentValue) => {
      const nextValue = !currentValue
      if (nextValue) {
        setIsTuneMenuOpen(false)
        onContextOptionsOpen?.()
      }
      return nextValue
    })
  }

  const handleToggleTuneMenu = () => {
    setIsTuneMenuOpen((currentValue) => {
      const nextValue = !currentValue
      if (nextValue) {
        setIsContextMenuOpen(false)
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

  const toolbarIconProps = {
    size: 14,
    strokeWidth: 1.8,
  }
  const selectedProviderLabel =
    availableProviders.find((provider) => provider.value === providerValue)?.label ?? providerValue
  const selectedProfileLabel =
    availableProfiles.find((profile) => profile.value === profileValue)?.label ?? profileValue
  const selectedRoleLabel = availableRoles.find((role) => role.value === roleValue)?.label ?? roleValue
  const selectedModeLabel = availableModes.find((mode) => mode.value === modeValue)?.label ?? modeValue
  const tuneSummary = [profileValue, roleValue, modeValue]
    .filter((segment) => segment.trim() !== '')
    .join(' · ')

  return (
    <RunaDomScopeProvider component="ai-composer-widget">
      <ClearBox
        runaComponent="ai-composer-root"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}
      >
        <ClearBox data-runa-ai-composer-toolbar="" runaComponent="ai-composer-toolbar" style={aiToolbarStyle}>
          <ClearBox runaComponent="ai-composer-toolbar-control-strip" style={aiToolbarControlStripStyle}>
            <ClearBox data-runa-ai-composer-control-grid="" style={aiToolbarControlsStyle}>
              {availableProviders.length > 0 ? (
                <ClearBox runaComponent="ai-composer-provider-stack" style={aiToolbarFieldStackStyle}>
                  <ClearBox style={aiToolbarFieldInlineStyle}>
                    <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                      <Bot {...toolbarIconProps} />
                    </Box>
                  </ClearBox>
                  <Select
                    aria-label="AI provider"
                    className="runa-ui-select"
                    disabled={disabled}
                    onChange={(event) => onProviderChange?.(event.currentTarget.value)}
                    runaComponent="ai-composer-provider-select"
                    style={aiToolbarProviderSelectStyle}
                    title={selectedProviderLabel}
                    value={providerValue}
                  >
                    {availableProviders.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                </ClearBox>
              ) : null}
              {availableModels.length > 0 ? (
                <ClearBox runaComponent="ai-composer-model-stack" style={aiToolbarFieldStackStyle}>
                  <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                    <Cpu {...toolbarIconProps} />
                  </Box>
                  <Select
                    aria-label="AI model"
                    className="runa-ui-select"
                    disabled={disabled}
                    onChange={(event) => onModelChange?.(event.currentTarget.value)}
                    runaComponent="ai-composer-model-select"
                    style={aiToolbarModelSelectStyle}
                    title={modelValue}
                    value={modelValue}
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </Select>
                </ClearBox>
              ) : null}
              {availableProfiles.length > 0 || availableRoles.length > 0 || availableModes.length > 0 ? (
                <ClearBox
                  ref={tuneMenuWrapRef}
                  runaComponent="ai-composer-tune-stack"
                  style={{ ...aiToolbarFieldStackStyle, position: 'relative' }}
                >
                  <Button
                    aria-controls={isTuneMenuOpen ? tuneMenuId : undefined}
                    aria-expanded={isTuneMenuOpen}
                    aria-label="Agent tuning"
                    className="runa-ui-select"
                    disabled={disabled}
                    onClick={handleToggleTuneMenu}
                    runaComponent="ai-composer-tune-trigger"
                    style={aiToolbarTuneTriggerStyle}
                    title={tuneSummary || 'Tune'}
                  >
                    <Box style={aiToolbarContextTriggerLabelClusterStyle}>
                      <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                        <SlidersHorizontal {...toolbarIconProps} />
                      </Box>
                      <Text style={aiToolbarTuneTriggerMetaStyle}>{tuneSummary || 'Tune'}</Text>
                    </Box>
                    <ChevronDown size={14} strokeWidth={1.8} />
                  </Button>
                  {isTuneMenuOpen ? (
                    <Box
                      id={tuneMenuId}
                      runaComponent="ai-composer-tune-menu-wrap"
                      style={aiComposerSecondaryMenuWrapStyle}
                    >
                      <Surface
                        role="dialog"
                        aria-label="Agent tuning"
                        runaComponent="ai-composer-tune-menu"
                        style={aiComposerSecondaryMenuStyle}
                      >
                        <Box style={aiComposerSecondaryMenuHeaderStyle}>
                          <Text style={aiComposerSecondaryMenuTitleStyle}>Agent tuning</Text>
                          <Text style={aiComposerSecondaryMenuMetaStyle}>
                            Profile, role, and mode stay available without consuming the whole toolbar row.
                          </Text>
                        </Box>
                        <Box style={aiComposerSecondaryMenuControlStackStyle}>
                          {availableProfiles.length > 0 ? (
                            <ClearBox
                              runaComponent="ai-composer-profile-stack"
                              style={aiToolbarFieldStackStyle}
                            >
                              <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                                <Shield {...toolbarIconProps} />
                              </Box>
                              <Select
                                aria-label="Agent profile"
                                className="runa-ui-select"
                                disabled={disabled}
                                onChange={(event) => onProfileChange?.(event.currentTarget.value)}
                                runaComponent="ai-composer-profile-select"
                                style={aiToolbarProviderSelectStyle}
                                title={selectedProfileLabel}
                                value={profileValue}
                              >
                                {availableProfiles.map((profile) => (
                                  <option key={profile.value} value={profile.value}>
                                    {profile.label}
                                  </option>
                                ))}
                              </Select>
                            </ClearBox>
                          ) : null}
                          {availableRoles.length > 0 ? (
                            <ClearBox runaComponent="ai-composer-role-stack" style={aiToolbarFieldStackStyle}>
                              <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                                <UserRound {...toolbarIconProps} />
                              </Box>
                              <Select
                                aria-label="Agent role"
                                className="runa-ui-select"
                                disabled={disabled}
                                onChange={(event) => onRoleChange?.(event.currentTarget.value)}
                                runaComponent="ai-composer-role-select"
                                style={aiToolbarProviderSelectStyle}
                                title={selectedRoleLabel}
                                value={roleValue}
                              >
                                {availableRoles.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </Select>
                            </ClearBox>
                          ) : null}
                          {availableModes.length > 0 ? (
                            <ClearBox runaComponent="ai-composer-mode-stack" style={aiToolbarFieldStackStyle}>
                              <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                                <Wrench {...toolbarIconProps} />
                              </Box>
                              <Select
                                aria-label="Agent mode"
                                className="runa-ui-select"
                                disabled={disabled}
                                onChange={(event) => onModeChange?.(event.currentTarget.value)}
                                runaComponent="ai-composer-mode-select"
                                style={aiToolbarProviderSelectStyle}
                                title={selectedModeLabel}
                                value={modeValue}
                              >
                                {availableModes.map((mode) => (
                                  <option key={mode.value} value={mode.value}>
                                    {mode.label}
                                  </option>
                                ))}
                              </Select>
                            </ClearBox>
                          ) : null}
                        </Box>
                      </Surface>
                    </Box>
                  ) : null}
                </ClearBox>
              ) : null}
              <ClearBox runaComponent="ai-composer-context-stack" style={aiToolbarFieldStackStyle}>
                <Button
                  aria-controls={isContextMenuOpen ? contextMenuId : undefined}
                  aria-expanded={isContextMenuOpen}
                  aria-label="Composer options"
                  className="runa-ui-select"
                  disabled={disabled}
                  onClick={handleToggleContextMenu}
                  runaComponent="ai-composer-context-trigger"
                  style={{
                    ...aiToolbarContextTriggerStyle,
                    ...(isContextMenuOpen || (isWidgetContextEnabled && selectedContextCount > 0)
                      ? aiToolbarContextTriggerActiveStyle
                      : {}),
                  }}
                  title={contextSummaryPrimary}
                >
                  <Box style={aiToolbarContextTriggerLabelClusterStyle}>
                    <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                      <PanelsTopLeft {...toolbarIconProps} />
                    </Box>
                    <Text style={aiToolbarContextTriggerMetaStyle}>{contextSummaryPrimary}</Text>
                  </Box>
                  <ChevronDown size={14} strokeWidth={1.8} />
                </Button>
              </ClearBox>
            </ClearBox>
          </ClearBox>
        </ClearBox>
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
                  className="runa-ui-chip runa-ui-button-quiet-danger"
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
                  className="runa-ui-chip"
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
        {hasAttachments ? (
          <Box runaComponent="ai-composer-attachment-strip" style={aiComposerContextStripStyle}>
            <Text runaComponent="ai-composer-attachment-strip-label" style={aiComposerContextStripLabelStyle}>
              Attachments
            </Text>
            <Box runaComponent="ai-composer-attachment-strip-row" style={aiComposerContextStripRowStyle}>
              {attachments.map((attachment) => (
                <Button
                  key={attachment.id}
                  aria-label={`Remove attachment ${attachment.name}`}
                  className="runa-ui-chip runa-ui-button-quiet-danger"
                  disabled={disabled}
                  onClick={() => onRemoveAttachment?.(attachment.id)}
                  runaComponent="ai-composer-attachment-strip-chip"
                  style={aiComposerContextStripRemoveStyle}
                >
                  <Text style={aiComposerContextStripValueStyle}>{attachment.name}</Text>
                  <X size={12} strokeWidth={1.8} />
                </Button>
              ))}
            </Box>
          </Box>
        ) : null}
        {hasRecentAttachments ? (
          <Box runaComponent="ai-composer-recent-attachment-strip" style={aiComposerContextStripStyle}>
            <Text
              runaComponent="ai-composer-recent-attachment-strip-label"
              style={aiComposerContextStripLabelStyle}
            >
              {isAttachmentLibraryPending ? 'Recent attachments · loading' : 'Recent attachments'}
            </Text>
            <Box
              runaComponent="ai-composer-recent-attachment-strip-row"
              style={aiComposerContextStripRowStyle}
            >
              {recentAttachments.map((attachment) => (
                <Box
                  key={attachment.id}
                  runaComponent="ai-composer-recent-attachment-chip"
                  className="runa-ui-chip"
                  style={{
                    ...aiToolbarChipStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Button
                    aria-label={`Reuse attachment ${attachment.name}`}
                    className="runa-ui-chip"
                    onClick={() => onReuseRecentAttachment?.(attachment)}
                    runaComponent="ai-composer-recent-attachment-reuse"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      padding: 0,
                    }}
                  >
                    {attachment.name}
                  </Button>
                  <IconButton
                    aria-label={`Delete stored attachment ${attachment.name}`}
                    className="runa-ui-button-quiet-danger"
                    onClick={() => onDeleteStoredAttachment?.(attachment.id)}
                    runaComponent="ai-composer-recent-attachment-delete"
                    size="sm"
                  >
                    <X size={10} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}
        {missingContextWidgetCount > 0 && !isContextMenuOpen ? (
          <Box
            runaComponent="ai-composer-context-repair-notice-inline"
            style={aiComposerContextRepairNoticeStyle}
          >
            <Text style={aiComposerContextRepairNoticeTextStyle}>
              {missingContextWidgetCount === 1
                ? '1 saved widget is no longer available in this workspace.'
                : `${missingContextWidgetCount} saved widgets are no longer available in this workspace.`}
            </Text>
            <Box style={aiComposerContextRepairNoticeActionsStyle}>
              <Button
                disabled={disabled}
                onClick={() => onRepairMissingContextWidgets?.()}
                className="runa-ui-select"
                style={aiComposerContextQuickActionStyle}
              >
                Save cleaned context
              </Button>
            </Box>
          </Box>
        ) : null}
        <Surface
          data-runa-ai-composer-surface=""
          runaComponent="ai-composer-surface"
          style={aiComposerSurfaceStyle}
        >
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
                {missingContextWidgetCount > 0 ? (
                  <Box style={aiComposerContextRepairNoticeStyle}>
                    <Text style={aiComposerContextRepairNoticeTextStyle}>
                      {missingContextWidgetCount === 1
                        ? '1 saved widget is no longer available in this workspace.'
                        : `${missingContextWidgetCount} saved widgets are no longer available in this workspace.`}
                    </Text>
                    <Box style={aiComposerContextRepairNoticeActionsStyle}>
                      <Button
                        disabled={disabled}
                        onClick={() => onRepairMissingContextWidgets?.()}
                        className="runa-ui-select"
                        style={aiComposerContextQuickActionStyle}
                      >
                        Save cleaned context
                      </Button>
                    </Box>
                  </Box>
                ) : null}
                <Box style={aiComposerContextQuickActionsStyle}>
                  <Button
                    disabled={disabled || !activeContextWidgetOption || isCurrentContextWidgetSelected}
                    className="runa-ui-select"
                    onClick={() => onContextUseCurrentWidget?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    Use current
                  </Button>
                  <Button
                    disabled={disabled || !activeContextWidgetOption}
                    className="runa-ui-select"
                    onClick={() => onContextOnlyUseCurrentWidget?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    Only current
                  </Button>
                  <Button
                    disabled={disabled || contextWidgetOptions.length === 0 || areAllWidgetsSelected}
                    className="runa-ui-select"
                    onClick={() => onContextUseAllWidgets?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    All widgets
                  </Button>
                  <Button
                    disabled={disabled || (!isWidgetContextEnabled && selectedContextCount === 0)}
                    className="runa-ui-select"
                    onClick={() => onContextUseDefault?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    Use default
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
            className="runa-ui-textarea"
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
            {isSubmitting && onCancelSubmit ? (
              <IconButton
                aria-label="Cancel response"
                className="runa-ui-button-quiet-danger"
                onClick={() => {
                  onCancelSubmit()
                }}
                runaComponent="ai-composer-cancel"
                style={aiComposerActionStyle}
              >
                <X size={18} strokeWidth={1.8} />
              </IconButton>
            ) : (
              <IconButton
                aria-label="Send prompt"
                className={submitDisabled ? undefined : 'runa-ui-button-primary'}
                disabled={submitDisabled}
                onClick={() => {
                  onSubmit?.()
                }}
                runaComponent="ai-composer-send"
                style={aiComposerActionStyle}
              >
                <SendHorizontal size={18} strokeWidth={1.8} />
              </IconButton>
            )}
          </Box>
        </Surface>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
