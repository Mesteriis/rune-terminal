import { Ellipsis, Maximize2, Minus, Pencil, Plus, Trash2, Sparkles, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { ClearBox } from '@/shared/ui/components'
import { Box, Button, Input } from '@/shared/ui/primitives'
import type { AppLocale } from '@/shared/api/runtime'
import { shellTopbarWidgetCopy } from '@/widgets/shell/shell-topbar-widget-copy'
import {
  activeWorkspaceTabStyle,
  addWorkspaceButtonStyle,
  iconButtonStyle,
  tabStripStyle,
  topbarStyle,
  workspaceStripShellStyle,
  workspaceTabButtonStyle,
  workspaceTabDangerActionStyle,
  workspaceTabLabelStyle,
  workspaceTabMenuActionStyle,
  workspaceTabMenuMutedActionStyle,
  workspaceTabMenuStyle,
  workspaceTabMenuTriggerStyle,
  workspaceTabMenuWrapStyle,
  workspaceTabRenameActionsStyle,
  workspaceTabRenameButtonStyle,
  workspaceTabRenameFormStyle,
  workspaceTabRenameInputStyle,
  workspaceTabStyle,
} from '@/widgets/shell/shell-topbar-widget.styles'

export type ShellWorkspaceTab = {
  id: number
  title: string
}

type ShellTopbarWidgetProps = {
  isAiOpen: boolean
  locale?: AppLocale
  onToggleAi: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleFullscreen: () => void
  workspaceTabs: ShellWorkspaceTab[]
  activeWorkspaceId: number
  onSelectWorkspace: (workspaceId: number) => void
  onAddWorkspace: () => void
  onRenameWorkspace: (workspaceId: number, title: string) => void
  onDeleteWorkspace: (workspaceId: number) => void
}

const actionIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

export function ShellTopbarWidget({
  isAiOpen,
  locale = 'en',
  onToggleAi,
  onClose,
  onMinimize,
  onToggleFullscreen,
  workspaceTabs,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
}: ShellTopbarWidgetProps) {
  const copy = shellTopbarWidgetCopy[locale]
  const menuWrapRef = useRef<HTMLDivElement | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const [openWorkspaceMenuId, setOpenWorkspaceMenuId] = useState<number | null>(null)
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputId = useId()

  useEffect(() => {
    if (renamingWorkspaceId === null) {
      return
    }

    renameInputRef.current?.focus()
    renameInputRef.current?.select()
  }, [renamingWorkspaceId])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) {
        setOpenWorkspaceMenuId(null)
        setRenamingWorkspaceId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      setOpenWorkspaceMenuId(null)
      setRenamingWorkspaceId(null)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const closeWorkspaceMenu = () => {
    setOpenWorkspaceMenuId(null)
    setRenamingWorkspaceId(null)
  }

  const handleToggleWorkspaceMenu = (workspaceId: number, workspaceTitle: string) => {
    setOpenWorkspaceMenuId((currentWorkspaceId) => {
      const nextWorkspaceId = currentWorkspaceId === workspaceId ? null : workspaceId
      setRenamingWorkspaceId(null)
      setRenameDraft(nextWorkspaceId === workspaceId ? workspaceTitle : '')
      return nextWorkspaceId
    })
  }

  const handleStartRenameWorkspace = (workspaceId: number, workspaceTitle: string) => {
    setOpenWorkspaceMenuId(workspaceId)
    setRenamingWorkspaceId(workspaceId)
    setRenameDraft(workspaceTitle)
  }

  const handleSubmitWorkspaceRename = (workspaceId: number) => {
    onRenameWorkspace(workspaceId, renameDraft)
    closeWorkspaceMenu()
  }

  const canDeleteWorkspace = workspaceTabs.length > 1

  return (
    <RunaDomScopeProvider component="shell-topbar-widget">
      <Box runaComponent="shell-topbar-root" style={topbarStyle}>
        <Button
          aria-label={copy.closeWindow}
          className="runa-ui-button-quiet-danger"
          onClick={onClose}
          runaComponent="shell-topbar-close-window"
          style={iconButtonStyle}
        >
          <X {...actionIconProps} />
        </Button>
        <Button
          aria-label={copy.collapseWindow}
          onClick={onMinimize}
          runaComponent="shell-topbar-collapse-window"
          style={iconButtonStyle}
        >
          <Minus {...actionIconProps} />
        </Button>
        <Button
          aria-label={copy.toggleFullscreen}
          onClick={onToggleFullscreen}
          runaComponent="shell-topbar-toggle-fullscreen"
          style={iconButtonStyle}
        >
          <Maximize2 {...actionIconProps} />
        </Button>
        <Button
          aria-label={copy.toggleAiPanel}
          aria-pressed={isAiOpen}
          onClick={onToggleAi}
          runaComponent="shell-topbar-toggle-ai-panel"
          style={iconButtonStyle}
        >
          <Sparkles {...actionIconProps} />
        </Button>
        <ClearBox runaComponent="shell-topbar-workspace-strip-shell" style={workspaceStripShellStyle}>
          <ClearBox
            role="tablist"
            aria-label={copy.workspaceTabs}
            runaComponent="shell-topbar-workspace-tabs"
            style={tabStripStyle}
          >
            {workspaceTabs.map((workspace) => {
              const isWorkspaceMenuOpen = openWorkspaceMenuId === workspace.id
              const isWorkspaceRenaming = renamingWorkspaceId === workspace.id

              return (
                <ClearBox
                  data-selected={activeWorkspaceId === workspace.id}
                  key={workspace.id}
                  runaComponent={`shell-topbar-workspace-tab-${workspace.id}`}
                  style={activeWorkspaceId === workspace.id ? activeWorkspaceTabStyle : workspaceTabStyle}
                >
                  <Button
                    aria-selected={activeWorkspaceId === workspace.id}
                    className="runa-ui-tab"
                    data-selected={activeWorkspaceId === workspace.id}
                    onClick={() => onSelectWorkspace(workspace.id)}
                    role="tab"
                    runaComponent={`shell-topbar-workspace-tab-button-${workspace.id}`}
                    style={workspaceTabButtonStyle}
                    title={workspace.title}
                  >
                    <ClearBox
                      runaComponent={`shell-topbar-workspace-tab-label-${workspace.id}`}
                      style={workspaceTabLabelStyle}
                    >
                      {workspace.title}
                    </ClearBox>
                  </Button>
                  <ClearBox
                    ref={isWorkspaceMenuOpen ? menuWrapRef : null}
                    runaComponent={`shell-topbar-workspace-tab-menu-wrap-${workspace.id}`}
                    style={workspaceTabMenuWrapStyle}
                  >
                    <Button
                      aria-expanded={isWorkspaceMenuOpen}
                      aria-haspopup="menu"
                      aria-label={copy.workspaceActions(workspace.title)}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleToggleWorkspaceMenu(workspace.id, workspace.title)
                      }}
                      runaComponent={`shell-topbar-workspace-tab-menu-trigger-${workspace.id}`}
                      style={workspaceTabMenuTriggerStyle}
                    >
                      <Ellipsis size={12} strokeWidth={1.75} />
                    </Button>
                    {isWorkspaceMenuOpen ? (
                      <ClearBox
                        aria-label={copy.workspaceActions(workspace.title)}
                        role="menu"
                        runaComponent={`shell-topbar-workspace-tab-menu-${workspace.id}`}
                        style={workspaceTabMenuStyle}
                      >
                        {isWorkspaceRenaming ? (
                          <form
                            onClick={(event) => event.stopPropagation()}
                            onSubmit={(event) => {
                              event.preventDefault()
                              handleSubmitWorkspaceRename(workspace.id)
                            }}
                          >
                            <ClearBox
                              runaComponent={`shell-topbar-workspace-rename-form-${workspace.id}`}
                              style={workspaceTabRenameFormStyle}
                            >
                              <Input
                                aria-label={copy.workspaceName}
                                id={renameInputId}
                                onChange={(event) => setRenameDraft(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    event.preventDefault()
                                    setRenamingWorkspaceId(null)
                                  }
                                }}
                                ref={renameInputRef}
                                runaComponent={`shell-topbar-workspace-rename-input-${workspace.id}`}
                                style={workspaceTabRenameInputStyle}
                                value={renameDraft}
                              />
                              <ClearBox
                                runaComponent={`shell-topbar-workspace-rename-actions-${workspace.id}`}
                                style={workspaceTabRenameActionsStyle}
                              >
                                <Button
                                  runaComponent={`shell-topbar-workspace-rename-save-${workspace.id}`}
                                  style={workspaceTabRenameButtonStyle}
                                  type="submit"
                                >
                                  {copy.save}
                                </Button>
                                <Button
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setRenamingWorkspaceId(null)
                                  }}
                                  runaComponent={`shell-topbar-workspace-rename-cancel-${workspace.id}`}
                                  style={workspaceTabRenameButtonStyle}
                                >
                                  {copy.cancel}
                                </Button>
                              </ClearBox>
                            </ClearBox>
                          </form>
                        ) : (
                          <>
                            <Button
                              onClick={(event) => {
                                event.stopPropagation()
                                handleStartRenameWorkspace(workspace.id, workspace.title)
                              }}
                              role="menuitem"
                              runaComponent={`shell-topbar-workspace-rename-action-${workspace.id}`}
                              style={workspaceTabMenuActionStyle}
                            >
                              <Pencil size={13} strokeWidth={1.75} />
                              {copy.rename}
                            </Button>
                            <Button
                              aria-disabled={!canDeleteWorkspace}
                              disabled={!canDeleteWorkspace}
                              onClick={(event) => {
                                event.stopPropagation()
                                if (!canDeleteWorkspace) {
                                  return
                                }

                                onDeleteWorkspace(workspace.id)
                                closeWorkspaceMenu()
                              }}
                              role="menuitem"
                              runaComponent={`shell-topbar-workspace-delete-action-${workspace.id}`}
                              style={
                                canDeleteWorkspace
                                  ? workspaceTabDangerActionStyle
                                  : workspaceTabMenuMutedActionStyle
                              }
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                              {copy.delete}
                            </Button>
                          </>
                        )}
                      </ClearBox>
                    ) : null}
                  </ClearBox>
                </ClearBox>
              )
            })}
          </ClearBox>
          <Button
            aria-label={copy.addWorkspace}
            onClick={onAddWorkspace}
            runaComponent="shell-topbar-add-workspace"
            style={addWorkspaceButtonStyle}
          >
            <Plus {...actionIconProps} />
          </Button>
        </ClearBox>
      </Box>
    </RunaDomScopeProvider>
  )
}
