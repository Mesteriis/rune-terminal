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
import type { AppLocale } from '@/shared/api/runtime'
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
import { getAiWidgetCopy, localizeAiAgentModeOption } from '@/widgets/ai/ai-widget-copy'

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
  locale?: AppLocale
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
  locale = 'en',
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
  const localizedModes = availableModes.map((mode) => localizeAiAgentModeOption(mode, locale))
  const copy = getAiWidgetCopy(locale).composer
  const selectedContextCount = selectedContextWidgetIDs.length
  const hasAttachments = attachments.length > 0
  const hasRecentAttachments = recentAttachments.length > 0
  const selectedContextOptions = selectedContextWidgetIDs
    .map((widgetID) => contextWidgetOptions.find((option) => option.value === widgetID) ?? null)
    .filter((option): option is AiContextWidgetOption => option != null)
  const contextSummaryPrimary = !isWidgetContextEnabled
    ? copy.contextOff
    : selectedContextCount === 0
      ? (activeContextWidgetOption?.title ?? copy.contextWidgets)
      : selectedContextCount === 1
        ? (selectedContextOptions[0]?.title ?? copy.widgetCount(1))
        : copy.widgetCount(selectedContextCount)
  const contextSummarySecondary = !isWidgetContextEnabled
    ? copy.excludedFromRequest
    : selectedContextCount === 0
      ? (activeContextWidgetOption?.meta ?? copy.useCurrentWidgetHint)
      : selectedContextCount === 1
        ? (selectedContextOptions[0]?.meta ?? copy.selectedForRequest)
        : `${selectedContextOptions
            .slice(0, 2)
            .map((option) => option.title ?? option.label)
            .join(', ')}${selectedContextCount > 2 ? ` +${selectedContextCount - 2}` : ''}`
  const isCurrentContextWidgetSelected =
    activeContextWidgetID != null && selectedContextWidgetIDs.includes(activeContextWidgetID)
  const showCurrentContextStrip =
    isWidgetContextEnabled && selectedContextCount === 0 && activeContextWidgetOption != null
  const hasContextStripItems = selectedContextOptions.length > 0 || showCurrentContextStrip
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
  const selectedModeLabel = localizedModes.find((mode) => mode.value === modeValue)?.label ?? modeValue
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
                    aria-label={copy.providerAriaLabel}
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
                    aria-label={copy.modelAriaLabel}
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
                    aria-label={copy.tuneAriaLabel}
                    className="runa-ui-select"
                    disabled={disabled}
                    onClick={handleToggleTuneMenu}
                    runaComponent="ai-composer-tune-trigger"
                    style={aiToolbarTuneTriggerStyle}
                    title={tuneSummary || copy.tuneFallback}
                  >
                    <Box style={aiToolbarContextTriggerLabelClusterStyle}>
                      <Box aria-hidden="true" style={aiToolbarFieldIconStyle}>
                        <SlidersHorizontal {...toolbarIconProps} />
                      </Box>
                      <Text style={aiToolbarTuneTriggerMetaStyle}>{tuneSummary || copy.tuneFallback}</Text>
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
                        aria-label={copy.tuneAriaLabel}
                        runaComponent="ai-composer-tune-menu"
                        style={aiComposerSecondaryMenuStyle}
                      >
                        <Box style={aiComposerSecondaryMenuHeaderStyle}>
                          <Text style={aiComposerSecondaryMenuTitleStyle}>{copy.tuneAriaLabel}</Text>
                          <Text style={aiComposerSecondaryMenuMetaStyle}>{copy.tuneDescription}</Text>
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
                                aria-label={copy.profileAriaLabel}
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
                                aria-label={copy.roleAriaLabel}
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
                                aria-label={copy.modeAriaLabel}
                                className="runa-ui-select"
                                disabled={disabled}
                                onChange={(event) => onModeChange?.(event.currentTarget.value)}
                                runaComponent="ai-composer-mode-select"
                                style={aiToolbarProviderSelectStyle}
                                title={selectedModeLabel}
                                value={modeValue}
                              >
                                {localizedModes.map((mode) => (
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
                  aria-label={copy.composerOptionsAriaLabel}
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
        {isWidgetContextEnabled && hasContextStripItems ? (
          <Box runaComponent="ai-composer-context-strip" style={aiComposerContextStripStyle}>
            <Text runaComponent="ai-composer-context-strip-label" style={aiComposerContextStripLabelStyle}>
              {copy.requestContext}
            </Text>
            <Box runaComponent="ai-composer-context-strip-row" style={aiComposerContextStripRowStyle}>
              {selectedContextOptions.map((option) => (
                <Button
                  key={option.value}
                  aria-label={copy.removeContextAriaLabel(option.title ?? option.label)}
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
                    {copy.currentPrefix} {activeContextWidgetOption.title ?? activeContextWidgetOption.label}
                  </Text>
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : null}
        {hasAttachments ? (
          <Box runaComponent="ai-composer-attachment-strip" style={aiComposerContextStripStyle}>
            <Text runaComponent="ai-composer-attachment-strip-label" style={aiComposerContextStripLabelStyle}>
              {copy.attachments}
            </Text>
            <Box runaComponent="ai-composer-attachment-strip-row" style={aiComposerContextStripRowStyle}>
              {attachments.map((attachment) => (
                <Button
                  key={attachment.id}
                  aria-label={copy.removeAttachmentAriaLabel(attachment.name)}
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
              {isAttachmentLibraryPending ? copy.recentAttachmentsLoading : copy.recentAttachments}
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
                    aria-label={copy.reuseAttachmentAriaLabel(attachment.name)}
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
                    aria-label={copy.deleteStoredAttachmentAriaLabel(attachment.name)}
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
              {copy.missingSavedWidgets(missingContextWidgetCount)}
            </Text>
            <Box style={aiComposerContextRepairNoticeActionsStyle}>
              <Button
                disabled={disabled}
                onClick={() => onRepairMissingContextWidgets?.()}
                className="runa-ui-select"
                style={aiComposerContextQuickActionStyle}
              >
                {copy.saveCleanedContext}
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
                aria-label={copy.contextWidgetsDialog}
                runaComponent="ai-composer-context-menu"
                style={aiComposerContextMenuStyle}
              >
                <Box runaComponent="ai-composer-context-menu-header" style={aiComposerContextMenuHeaderStyle}>
                  <Text
                    runaComponent="ai-composer-context-menu-title"
                    style={aiComposerContextMenuTitleStyle}
                  >
                    {copy.requestContext}
                  </Text>
                  <Text runaComponent="ai-composer-context-menu-meta" style={aiComposerContextMenuMetaStyle}>
                    {selectedContextCount > 0
                      ? copy.selectedCount(selectedContextCount)
                      : copy.noWidgetsSelected}
                  </Text>
                </Box>
                <Box style={aiComposerContextSummaryListStyle}>
                  <Box style={aiComposerContextSummaryRowStyle}>
                    <Text style={aiComposerContextSummaryLabelStyle}>{copy.current}</Text>
                    <Text style={aiComposerContextSummaryValueStyle}>
                      {activeContextWidgetOption?.title ?? copy.noActiveWidget}
                      {activeContextWidgetOption?.meta ? ` · ${activeContextWidgetOption.meta}` : ''}
                    </Text>
                  </Box>
                  <Box style={aiComposerContextSummaryRowStyle}>
                    <Text style={aiComposerContextSummaryLabelStyle}>{copy.selected}</Text>
                    <Text style={aiComposerContextSummaryValueStyle}>{contextSummarySecondary}</Text>
                  </Box>
                </Box>
                {missingContextWidgetCount > 0 ? (
                  <Box style={aiComposerContextRepairNoticeStyle}>
                    <Text style={aiComposerContextRepairNoticeTextStyle}>
                      {copy.missingSavedWidgets(missingContextWidgetCount)}
                    </Text>
                    <Box style={aiComposerContextRepairNoticeActionsStyle}>
                      <Button
                        disabled={disabled}
                        onClick={() => onRepairMissingContextWidgets?.()}
                        className="runa-ui-select"
                        style={aiComposerContextQuickActionStyle}
                      >
                        {copy.saveCleanedContext}
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
                    {copy.useCurrent}
                  </Button>
                  <Button
                    disabled={disabled || !activeContextWidgetOption}
                    className="runa-ui-select"
                    onClick={() => onContextOnlyUseCurrentWidget?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    {copy.onlyCurrent}
                  </Button>
                  <Button
                    disabled={disabled || contextWidgetOptions.length === 0 || areAllWidgetsSelected}
                    className="runa-ui-select"
                    onClick={() => onContextUseAllWidgets?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    {copy.allWidgets}
                  </Button>
                  <Button
                    disabled={disabled || (!isWidgetContextEnabled && selectedContextCount === 0)}
                    className="runa-ui-select"
                    onClick={() => onContextUseDefault?.()}
                    style={aiComposerContextQuickActionStyle}
                  >
                    {copy.useDefault}
                  </Button>
                </Box>
                <SwitcherControl
                  checked={isWidgetContextEnabled}
                  description={copy.useWidgetContextDescription}
                  disabled={disabled}
                  label={copy.useWidgetContextLabel}
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
                  label={copy.widgetsLabel}
                  onChange={onSelectedContextWidgetIDsChange ?? (() => {})}
                  options={contextWidgetOptions}
                  searchPlaceholder={copy.searchWidgetsPlaceholder}
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
              {isWidgetContextEnabled ? copy.contextBadge(selectedContextCount || 0) : copy.contextBadgeOff}
            </Badge>
            {isSubmitting && onCancelSubmit ? (
              <IconButton
                aria-label={copy.cancelResponseAriaLabel}
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
                aria-label={copy.sendPromptAriaLabel}
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
