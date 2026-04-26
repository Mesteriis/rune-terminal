import { Maximize2, Minus, Plus, Sparkles, X } from 'lucide-react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button } from '@/shared/ui/primitives'
import {
  activeWorkspaceTabStyle,
  addWorkspaceButtonStyle,
  iconButtonStyle,
  tabStripStyle,
  topbarStyle,
  workspaceStripShellStyle,
  workspaceTabStyle,
} from '@/widgets/shell/shell-topbar-widget.styles'

export type ShellWorkspaceTab = {
  id: number
  title: string
}

type ShellTopbarWidgetProps = {
  isAiOpen: boolean
  onToggleAi: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleFullscreen: () => void
  workspaceTabs: ShellWorkspaceTab[]
  activeWorkspaceId: number
  onSelectWorkspace: (workspaceId: number) => void
  onAddWorkspace: () => void
}

const actionIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

export function ShellTopbarWidget({
  isAiOpen,
  onToggleAi,
  onClose,
  onMinimize,
  onToggleFullscreen,
  workspaceTabs,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
}: ShellTopbarWidgetProps) {
  return (
    <RunaDomScopeProvider component="shell-topbar-widget">
      <Box runaComponent="shell-topbar-root" style={topbarStyle}>
        <Button
          aria-label="Close window"
          onClick={onClose}
          runaComponent="shell-topbar-close-window"
          style={iconButtonStyle}
        >
          <X {...actionIconProps} />
        </Button>
        <Button
          aria-label="Collapse window"
          onClick={onMinimize}
          runaComponent="shell-topbar-collapse-window"
          style={iconButtonStyle}
        >
          <Minus {...actionIconProps} />
        </Button>
        <Button
          aria-label="Toggle fullscreen"
          onClick={onToggleFullscreen}
          runaComponent="shell-topbar-toggle-fullscreen"
          style={iconButtonStyle}
        >
          <Maximize2 {...actionIconProps} />
        </Button>
        <Button
          aria-label="Toggle AI panel"
          aria-pressed={isAiOpen}
          onClick={onToggleAi}
          runaComponent="shell-topbar-toggle-ai-panel"
          style={iconButtonStyle}
        >
          <Sparkles {...actionIconProps} />
        </Button>
        <Box runaComponent="shell-topbar-workspace-strip-shell" style={workspaceStripShellStyle}>
          <Box
            role="tablist"
            aria-label="Workspace tabs"
            runaComponent="shell-topbar-workspace-tabs"
            style={tabStripStyle}
          >
            {workspaceTabs.map((workspace) => (
              <Button
                aria-selected={activeWorkspaceId === workspace.id}
                key={workspace.id}
                onClick={() => onSelectWorkspace(workspace.id)}
                role="tab"
                runaComponent={`shell-topbar-workspace-tab-${workspace.id}`}
                style={activeWorkspaceId === workspace.id ? activeWorkspaceTabStyle : workspaceTabStyle}
                title={workspace.title}
              >
                {workspace.title}
              </Button>
            ))}
          </Box>
          <Button
            aria-label="Add workspace"
            onClick={onAddWorkspace}
            runaComponent="shell-topbar-add-workspace"
            style={addWorkspaceButtonStyle}
          >
            <Plus {...actionIconProps} />
          </Button>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
