import { DockviewReact, type DockviewReadyEvent, type DockviewTheme } from 'dockview-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen, toggleAiSidebar } from '../shared/model/app'
import { BODY_MODAL_HOST_ID } from '../shared/model/modal'
import { Box, Text } from '../shared/ui/primitives'
import {
  AiPanelWidget,
  DockviewPanelWidget,
  ModalHostWidget,
  RightActionRailWidget,
  ShellTopbarWidget,
} from '../widgets'

const AI_PANEL_DEFAULT_RATIO = 0.3
const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_RESIZE_HANDLE_WIDTH = 6
const AI_SHELL_PANEL_HOST_ID = 'ai-shell-panel'
const AI_PANEL_ANIMATION_SECONDS = 0.84
const AI_PANEL_ANIMATION_EASE = [0.22, 0.61, 0.36, 1] as const
const DOCKVIEW_GROUP_GAP = 6
const WORKSPACE_MIN_WIDTH = 420

const runaDockviewTheme: DockviewTheme = {
  name: 'runa',
  className: 'runa-dockview-theme',
  gap: DOCKVIEW_GROUP_GAP,
}

const rootStyle = {
  position: 'relative' as const,
  height: '100%',
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'var(--color-canvas)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const mainShellStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const contentAreaStyle = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 'var(--gap-shell-chrome) var(--gap-shell-chrome) 0 0',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelShellStyle = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelShellContentStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelFrameStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelHeaderStyle = {
  height: 'var(--size-dockview-single-tab-header)',
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
  padding: '0 var(--space-sm)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiPanelTitleStyle = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
}

const aiPanelBodyStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden' as const,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const aiResizeHandleStyle = {
  flex: `0 0 ${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  width: `${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  minWidth: `${AI_PANEL_RESIZE_HANDLE_WIDTH}px`,
  minHeight: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  cursor: 'col-resize',
  position: 'relative' as const,
}

const workspaceStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const dockviewContainerStyle = {
  height: '100%',
  width: '100%',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  padding: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

function getDefaultAiPanelWidth() {
  if (typeof window === 'undefined') {
    return 450
  }

  return Math.round(window.innerWidth * AI_PANEL_DEFAULT_RATIO)
}

function clampAiPanelWidth(requestedWidth: number, contentAreaElement: HTMLDivElement | null) {
  if (!contentAreaElement) {
    return Math.max(AI_PANEL_MIN_WIDTH, requestedWidth)
  }

  const maxWidth = Math.max(
    AI_PANEL_MIN_WIDTH,
    contentAreaElement.clientWidth - WORKSPACE_MIN_WIDTH - AI_PANEL_RESIZE_HANDLE_WIDTH,
  )

  return Math.min(Math.max(requestedWidth, AI_PANEL_MIN_WIDTH), maxWidth)
}

const components = {
  default: DockviewPanelWidget,
}

export function App() {
  const [isAiSidebarOpen, onToggleAiSidebar] = useUnit([
    $isAiSidebarOpen,
    toggleAiSidebar,
  ])
  const [aiPanelWidth, setAiPanelWidth] = useState(getDefaultAiPanelWidth())
  const [isAiPanelResizing, setIsAiPanelResizing] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const contentAreaRef = useRef<HTMLDivElement | null>(null)
  const aiResizeStartRef = useRef<{ startWidth: number; startX: number } | null>(null)

  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api

    if (api.getPanel('terminal-header')) {
      return
    }

    api.addPanel({
      id: 'terminal-header',
      title: 'terminal-header',
      component: 'default',
    })

    api.addPanel({
      id: 'terminal',
      title: 'terminal',
      component: 'default',
      position: {
        direction: 'below',
      },
    })

    api.addPanel({
      id: 'tool',
      title: 'tool',
      component: 'default',
      position: {
        direction: 'right',
        referencePanel: 'terminal',
      },
    })
  }

  useEffect(() => {
    if (!isAiSidebarOpen) {
      return
    }

    setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
  }, [isAiSidebarOpen])

  useEffect(() => {
    if (!isAiSidebarOpen) {
      return
    }

    const handleWindowResize = () => {
      setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [isAiSidebarOpen])

  useEffect(() => {
    if (!isAiPanelResizing) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = aiResizeStartRef.current

      if (!resizeStart) {
        return
      }

      const nextWidth = resizeStart.startWidth + (event.clientX - resizeStart.startX)

      setAiPanelWidth(clampAiPanelWidth(nextWidth, contentAreaRef.current))
    }

    const handlePointerUp = () => {
      aiResizeStartRef.current = null
      setIsAiPanelResizing(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isAiPanelResizing])

  const aiShellWidth = aiPanelWidth + AI_PANEL_RESIZE_HANDLE_WIDTH
  const aiWidthTransition = isAiPanelResizing || prefersReducedMotion
    ? { duration: 0 }
    : { duration: AI_PANEL_ANIMATION_SECONDS, ease: AI_PANEL_ANIMATION_EASE }

  return (
    <Box style={rootStyle}>
      <Box style={mainShellStyle}>
        <ShellTopbarWidget isAiOpen={isAiSidebarOpen} onToggleAi={onToggleAiSidebar} />
        <Box ref={contentAreaRef} style={contentAreaStyle}>
          <AnimatePresence initial={false}>
            {isAiSidebarOpen ? (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: aiShellWidth }}
                exit={{ width: 0 }}
                key="ai-shell-panel"
                style={{
                  ...aiPanelShellStyle,
                  flex: '0 0 auto',
                }}
                transition={{ width: aiWidthTransition }}
              >
                <Box style={aiPanelShellContentStyle}>
                  <Box style={{ ...aiPanelFrameStyle, flex: `0 0 ${aiPanelWidth}px`, width: `${aiPanelWidth}px` }}>
                    <Box data-runa-shell-widget-frame="" data-runa-shell-widget-kind="ai" style={aiPanelFrameStyle}>
                      <Box data-runa-shell-widget-header="" style={aiPanelHeaderStyle}>
                        <Text style={aiPanelTitleStyle}>AI</Text>
                      </Box>
                      <Box style={aiPanelBodyStyle}>
                        <AiPanelWidget hostId={AI_SHELL_PANEL_HOST_ID} />
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    aria-hidden="true"
                    data-runa-shell-sash=""
                    onPointerDown={(event) => {
                      aiResizeStartRef.current = {
                        startWidth: aiPanelWidth,
                        startX: event.clientX,
                      }
                      setIsAiPanelResizing(true)
                      event.preventDefault()
                    }}
                    style={aiResizeHandleStyle}
                  />
                </Box>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <Box style={workspaceStyle}>
            <Box style={dockviewContainerStyle}>
              <DockviewReact
                components={components}
                onReady={handleReady}
                theme={runaDockviewTheme}
              />
            </Box>
          </Box>
        </Box>
      </Box>
      <RightActionRailWidget />
      <ModalHostWidget hostId={BODY_MODAL_HOST_ID} scope="body" />
    </Box>
  )
}
