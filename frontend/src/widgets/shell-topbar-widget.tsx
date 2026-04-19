import { Maximize2, Minus, Plus, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { Box, Button } from '../shared/ui/primitives'

type ShellTopbarWidgetProps = {
  isAiOpen: boolean
  onToggleAi: () => void
}

const topbarStyle = {
  height: 'var(--size-shell-header)',
  flex: '0 0 var(--size-shell-header)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  padding: '0 var(--padding-shell-inline) 0 0',
  border: 'none',
  background: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const tabStripStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  marginLeft: '2rem',
  border: 'none',
  background: 'transparent',
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const iconButtonStyle = {
  padding: '0',
  width: 'var(--size-control-min)',
  minWidth: 'var(--size-control-min)',
  height: 'var(--size-control-min)',
  minHeight: 'var(--size-control-min)',
  overflow: 'hidden',
}

const addWorkspaceButtonStyle = {
  ...iconButtonStyle,
  marginLeft: 'auto',
}

const actionIconProps = {
  size: 16,
  strokeWidth: 1.75,
}

export function ShellTopbarWidget({ isAiOpen, onToggleAi }: ShellTopbarWidgetProps) {
  const [workspaceTabs, setWorkspaceTabs] = useState([
    { id: 1, title: 'Workspace-1' },
    { id: 2, title: 'Workspace-2' },
  ])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(1)

  const handleAddWorkspace = () => {
    const nextWorkspaceId = workspaceTabs.length + 1

    setWorkspaceTabs((tabs) => [
      ...tabs,
      {
        id: nextWorkspaceId,
        title: `Workspace-${nextWorkspaceId}`,
      },
    ])
    setActiveWorkspaceId(nextWorkspaceId)
  }

  return (
    <RunaDomScopeProvider component="shell-topbar-widget">
      <Box runaComponent="shell-topbar-root" style={topbarStyle}>
      <Button aria-label="Close window" role="tab" aria-selected="false" runaComponent="shell-topbar-close-window" style={iconButtonStyle}>
        <X {...actionIconProps} />
      </Button>
      <Button aria-label="Collapse window" role="tab" aria-selected="false" runaComponent="shell-topbar-collapse-window" style={iconButtonStyle}>
        <Minus {...actionIconProps} />
      </Button>
      <Button aria-label="Toggle fullscreen" role="tab" aria-selected="false" runaComponent="shell-topbar-toggle-fullscreen" style={iconButtonStyle}>
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
      <Box role="tablist" aria-label="Workspace tabs" runaComponent="shell-topbar-workspace-tabs" style={tabStripStyle}>
        {workspaceTabs.map((workspace) => (
          <Button
            aria-selected={activeWorkspaceId === workspace.id}
            key={workspace.id}
            onClick={() => setActiveWorkspaceId(workspace.id)}
            role="tab"
            runaComponent={`shell-topbar-workspace-tab-${workspace.id}`}
          >
            {workspace.title}
          </Button>
        ))}
      </Box>
      <Button
        aria-label="Add workspace"
        onClick={handleAddWorkspace}
        runaComponent="shell-topbar-add-workspace"
        style={addWorkspaceButtonStyle}
      >
        <Plus {...actionIconProps} />
      </Button>
    </Box>
    </RunaDomScopeProvider>
  )
}
