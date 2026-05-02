import { useEffect, useMemo, useRef, type HTMLAttributes } from 'react'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { Badge, Input, ScrollArea, Separator, Surface, Text, type BoxProps } from '@/shared/ui/primitives'

import type { CommanderPaneController } from '@/widgets/commander/commander-pane-controller'
import { commanderPaneCopy } from '@/widgets/commander/commander-pane-copy'
import { CommanderPlainBox, CommanderPlainButton } from '@/widgets/commander/commander-plain'
import {
  commanderInactivePaneStateBadgeStyle,
  commanderPaneStateBadgeStyle,
  commanderPlainClusterStyle,
  getRowIcon,
  getRowTypeLabel,
  renderCommanderSortLabel,
} from '@/widgets/commander/commander-widget.shared'
import {
  commanderListHeaderButtonActiveStyle,
  commanderListHeaderButtonCenterAlignedStyle,
  commanderListHeaderButtonEndAlignedStyle,
  commanderListHeaderButtonStyle,
  commanderListHeaderStyle,
  commanderPaneActiveStyle,
  commanderPaneErrorBadgeStyle,
  commanderPaneFooterStyle,
  commanderPaneHeaderActiveStyle,
  commanderPaneHeaderStyle,
  commanderPaneMetaStyle,
  commanderPaneStatusBadgeStyle,
  commanderPaneStyle,
  commanderPaneTitleStyle,
  commanderPathFieldStyle,
  commanderPathInputStyle,
  commanderPathSuggestionActiveStyle,
  commanderPathSuggestionItemStyle,
  commanderPathSuggestionMetaStyle,
  commanderPathSuggestionTextStyle,
  commanderPathSuggestionsScrollStyle,
  commanderPathSuggestionsStyle,
  commanderPathTextStyle,
  commanderRowFocusedStyle,
  commanderRowHiddenStyle,
  commanderRowMetaTextStyle,
  commanderRowNameCellStyle,
  commanderRowNameTextStyle,
  commanderRowSelectedStyle,
  commanderRowStyle,
  commanderRowSymlinkArrowStyle,
  commanderRowSymlinkTargetStyle,
  commanderRowsStyle,
  commanderScrollAreaStyle,
  commanderStatusRowErrorStyle,
  commanderStatusRowStyle,
  commanderTypeBadgeStyle,
  commanderFooterTextStyle,
} from '@/widgets/commander/commander-widget.styles'

export type CommanderPaneProps = {
  controller: CommanderPaneController
}

function CommanderHeaderCell({
  onActivate,
  ...props
}: Omit<BoxProps, 'runaComponent'> & {
  onActivate?: () => void
  runaComponent: string
}) {
  return (
    <CommanderPlainBox
      {...props}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          onActivate?.()
        }
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)

        if (event.defaultPrevented) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate?.()
        }
      }}
      role="button"
      tabIndex={0}
    />
  )
}

/** Renders one commander pane from a pane-scoped controller object. */
export function CommanderPane({ controller }: CommanderPaneProps) {
  const { locale } = useAppLocale()
  const copy = commanderPaneCopy[locale]
  const { isActive, interactions, pane, pathEditor, sort } = controller
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const focusedRowId = useMemo(() => pane.rows.find((row) => row.focused)?.id ?? null, [pane.rows])

  useEffect(() => {
    if (!focusedRowId) {
      return
    }

    rowRefs.current[focusedRowId]?.scrollIntoView({
      block: 'nearest',
    })
  }, [focusedRowId])

  return (
    <Surface
      onPointerDown={() => {
        interactions.activate()
        interactions.focusRoot()
      }}
      runaComponent={`commander-pane-${pane.id}`}
      style={{ ...commanderPaneStyle, ...(isActive ? commanderPaneActiveStyle : null) }}
    >
      <CommanderPlainBox
        runaComponent={`commander-pane-${pane.id}-header`}
        style={{
          ...commanderPaneHeaderStyle,
          ...(isActive ? commanderPaneHeaderActiveStyle : null),
        }}
      >
        <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-title`} style={commanderPaneTitleStyle}>
          <Badge
            runaComponent={`commander-pane-${pane.id}-state`}
            style={isActive ? commanderPaneStateBadgeStyle : commanderInactivePaneStateBadgeStyle}
          >
            {isActive ? copy.active : copy.pane}
          </Badge>
          <CommanderPlainBox
            runaComponent={`commander-pane-${pane.id}-path-field`}
            style={commanderPathFieldStyle}
          >
            {pathEditor.isEditing ? (
              <>
                <Input
                  aria-label={`Commander ${pane.id} pane path`}
                  onBlur={() => pathEditor.onCancel({ focusRoot: false })}
                  onChange={(event) => pathEditor.onChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && pathEditor.suggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      pathEditor.onMoveSuggestion(1)
                      return
                    }

                    if (event.key === 'ArrowUp' && pathEditor.suggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      pathEditor.onMoveSuggestion(-1)
                      return
                    }

                    if (event.key === 'Tab' && pathEditor.suggestions.length > 0) {
                      event.preventDefault()
                      event.stopPropagation()
                      pathEditor.onApplySuggestion(
                        pathEditor.suggestions[pathEditor.suggestionIndex]?.displayPath ?? pathEditor.value,
                      )
                      return
                    }

                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.stopPropagation()
                      pathEditor.onConfirm()
                      return
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      event.stopPropagation()
                      pathEditor.onCancel()
                    }
                  }}
                  ref={pathEditor.inputRef}
                  runaComponent={`commander-pane-${pane.id}-path-input`}
                  style={commanderPathInputStyle}
                  value={pathEditor.value}
                />
                {pathEditor.suggestions.length > 0 ? (
                  <Surface
                    runaComponent={`commander-pane-${pane.id}-path-suggestions`}
                    style={commanderPathSuggestionsStyle}
                  >
                    <ScrollArea
                      runaComponent={`commander-pane-${pane.id}-path-suggestions-scroll`}
                      style={commanderPathSuggestionsScrollStyle}
                    >
                      <CommanderPlainBox
                        runaComponent={`commander-pane-${pane.id}-path-suggestions-list`}
                        style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                      >
                        {pathEditor.suggestions.map((suggestion, index) => {
                          const isSuggestionActive = index === pathEditor.suggestionIndex

                          return (
                            <CommanderPlainButton
                              key={suggestion.path}
                              onClick={() => pathEditor.onApplySuggestion(suggestion.path)}
                              onPointerDown={(event) => {
                                event.preventDefault()
                              }}
                              runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}`}
                              style={{
                                ...commanderPathSuggestionItemStyle,
                                ...(isSuggestionActive ? commanderPathSuggestionActiveStyle : null),
                              }}
                              title={suggestion.displayPath}
                            >
                              <Text
                                runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}-text`}
                                style={commanderPathSuggestionTextStyle}
                              >
                                {suggestion.displayPath}
                              </Text>
                              <Text
                                runaComponent={`commander-pane-${pane.id}-path-suggestion-${index + 1}-meta`}
                                style={commanderPathSuggestionMetaStyle}
                              >
                                {suggestion.meta}
                              </Text>
                            </CommanderPlainButton>
                          )
                        })}
                      </CommanderPlainBox>
                    </ScrollArea>
                  </Surface>
                ) : null}
              </>
            ) : (
              <Text
                onClick={(event) => {
                  if (!isActive) {
                    return
                  }

                  event.stopPropagation()
                  pathEditor.onStart()
                }}
                runaComponent={`commander-pane-${pane.id}-path`}
                style={commanderPathTextStyle}
                title={pane.path}
              >
                {pane.displayPath}
              </Text>
            )}
          </CommanderPlainBox>
        </CommanderPlainBox>
        <CommanderPlainBox
          runaComponent={`commander-pane-${pane.id}-meta`}
          style={commanderPlainClusterStyle}
        >
          {pane.filterQuery ? (
            <Badge
              runaComponent={`commander-pane-${pane.id}-filter`}
              style={commanderTypeBadgeStyle}
              title={pane.filterQuery}
            >
              FILTER {pane.filterQuery}
            </Badge>
          ) : null}
          {pane.isLoading ? (
            <Badge runaComponent={`commander-pane-${pane.id}-loading`} style={commanderPaneStatusBadgeStyle}>
              LOADING
            </Badge>
          ) : null}
          {pane.errorMessage ? (
            <Badge
              runaComponent={`commander-pane-${pane.id}-error`}
              style={commanderPaneErrorBadgeStyle}
              title={pane.errorMessage}
            >
              ERROR
            </Badge>
          ) : null}
          <Text runaComponent={`commander-pane-${pane.id}-items`} style={commanderPaneMetaStyle}>
            {copy.items(pane.counters.items)}
          </Text>
        </CommanderPlainBox>
      </CommanderPlainBox>
      <Separator runaComponent={`commander-pane-${pane.id}-header-separator`} />
      <CommanderPlainBox
        runaComponent={`commander-pane-${pane.id}-list-header`}
        style={commanderListHeaderStyle}
      >
        <CommanderHeaderCell
          onActivate={() => interactions.setSortMode('ext')}
          runaComponent={`commander-pane-${pane.id}-column-type`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonCenterAlignedStyle,
            ...(sort.mode === 'ext' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title={copy.sortByType}
        >
          {renderCommanderSortLabel(copy.type, sort.mode === 'ext', sort.direction)}
        </CommanderHeaderCell>
        <CommanderHeaderCell
          onActivate={() => interactions.setSortMode('name')}
          runaComponent={`commander-pane-${pane.id}-column-name`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...(sort.mode === 'name' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title={copy.sortByName}
        >
          {renderCommanderSortLabel(copy.name, sort.mode === 'name', sort.direction)}
        </CommanderHeaderCell>
        <Text runaComponent={`commander-pane-${pane.id}-column-git`} style={commanderPaneMetaStyle}>
          {copy.git}
        </Text>
        <CommanderHeaderCell
          onActivate={() => interactions.setSortMode('size')}
          runaComponent={`commander-pane-${pane.id}-column-size`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonEndAlignedStyle,
            ...(sort.mode === 'size' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title={copy.sortBySize}
        >
          {renderCommanderSortLabel(copy.size, sort.mode === 'size', sort.direction)}
        </CommanderHeaderCell>
        <CommanderHeaderCell
          onActivate={() => interactions.setSortMode('modified')}
          runaComponent={`commander-pane-${pane.id}-column-modified`}
          style={{
            ...commanderListHeaderButtonStyle,
            ...commanderListHeaderButtonEndAlignedStyle,
            ...(sort.mode === 'modified' ? commanderListHeaderButtonActiveStyle : null),
          }}
          title={copy.sortByModified}
        >
          {renderCommanderSortLabel(copy.modified, sort.mode === 'modified', sort.direction)}
        </CommanderHeaderCell>
      </CommanderPlainBox>
      <Separator runaComponent={`commander-pane-${pane.id}-list-separator`} />
      <ScrollArea runaComponent={`commander-pane-${pane.id}-scroll-area`} style={commanderScrollAreaStyle}>
        <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-rows`} style={commanderRowsStyle}>
          {pane.isLoading && pane.rows.length === 0 ? (
            <Text runaComponent={`commander-pane-${pane.id}-status-loading`} style={commanderStatusRowStyle}>
              {copy.loadingDirectory}
            </Text>
          ) : null}
          {pane.errorMessage && pane.rows.length === 0 ? (
            <Text
              runaComponent={`commander-pane-${pane.id}-status-error`}
              style={{
                ...commanderStatusRowStyle,
                ...commanderStatusRowErrorStyle,
              }}
            >
              {pane.errorMessage}
            </Text>
          ) : null}
          {pane.rows.map((row) => (
            <CommanderPlainBox
              key={row.id}
              onClick={(event) => {
                interactions.activate()
                interactions.setCursor(row.id, {
                  rangeSelect: event.shiftKey,
                })
                interactions.focusRoot()

                if (event.metaKey || event.ctrlKey) {
                  interactions.toggleSelection(row.id)
                }
              }}
              onDoubleClick={() => {
                interactions.activate()
                interactions.openEntry(row.id)
                interactions.focusRoot()
              }}
              ref={(node: HTMLDivElement | null) => {
                rowRefs.current[row.id] = node
              }}
              runaComponent={`commander-pane-${pane.id}-row-${row.id}`}
              style={{
                ...commanderRowStyle,
                ...(row.selected ? commanderRowSelectedStyle : null),
                ...(row.focused ? commanderRowFocusedStyle : null),
                ...(row.hidden ? commanderRowHiddenStyle : null),
              }}
            >
              <CommanderPlainBox
                runaComponent={`commander-pane-${pane.id}-row-${row.id}-icon`}
                style={{ ...commanderPlainClusterStyle, justifyContent: 'center' }}
              >
                {getRowIcon(row)}
              </CommanderPlainBox>
              <CommanderPlainBox
                runaComponent={`commander-pane-${pane.id}-row-${row.id}-name-cell`}
                style={commanderRowNameCellStyle}
              >
                <Text
                  runaComponent={`commander-pane-${pane.id}-row-${row.id}-name`}
                  style={commanderRowNameTextStyle}
                >
                  {row.name}
                </Text>
                <Badge
                  runaComponent={`commander-pane-${pane.id}-row-${row.id}-type`}
                  style={commanderTypeBadgeStyle}
                >
                  {getRowTypeLabel(row)}
                </Badge>
                {row.kind === 'symlink' && row.symlinkTarget ? (
                  <>
                    <Text
                      runaComponent={`commander-pane-${pane.id}-row-${row.id}-symlink-arrow`}
                      style={commanderRowSymlinkArrowStyle}
                    >
                      -&gt;
                    </Text>
                    <Text
                      runaComponent={`commander-pane-${pane.id}-row-${row.id}-symlink-target`}
                      style={commanderRowSymlinkTargetStyle}
                    >
                      {row.symlinkTarget}
                    </Text>
                  </>
                ) : null}
              </CommanderPlainBox>
              <Text
                runaComponent={`commander-pane-${pane.id}-row-${row.id}-git`}
                style={commanderRowMetaTextStyle}
              >
                {row.gitStatus ?? ''}
              </Text>
              <Text
                runaComponent={`commander-pane-${pane.id}-row-${row.id}-size`}
                style={commanderRowMetaTextStyle}
              >
                {row.kind === 'symlink' ? '' : row.size}
              </Text>
              <Text
                runaComponent={`commander-pane-${pane.id}-row-${row.id}-modified`}
                style={commanderRowMetaTextStyle}
              >
                {row.modified}
              </Text>
            </CommanderPlainBox>
          ))}
        </CommanderPlainBox>
      </ScrollArea>
      <Separator runaComponent={`commander-pane-${pane.id}-footer-separator`} />
      <CommanderPlainBox runaComponent={`commander-pane-${pane.id}-footer`} style={commanderPaneFooterStyle}>
        <Text runaComponent={`commander-pane-${pane.id}-selected-count`} style={commanderFooterTextStyle}>
          {copy.selected(pane.counters.selectedItems)}
        </Text>
        <Text runaComponent={`commander-pane-${pane.id}-selected-size`} style={commanderFooterTextStyle}>
          {pane.counters.selectedSize}
        </Text>
      </CommanderPlainBox>
    </Surface>
  )
}
