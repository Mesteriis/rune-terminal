import type { CSSProperties } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen } from '../../shared/model/app'

const aiSidebarStyle: CSSProperties = {
  position: 'absolute',
  top: 40,
  right: 0,
  bottom: 0,
  width: '50%',
  zIndex: 20,
  display: 'flex',
  alignItems: 'flex-start',
  boxSizing: 'border-box',
  padding: 16,
  overflow: 'auto',
  backgroundColor: '#ffffff',
  borderLeft: '1px solid #000000',
  pointerEvents: 'auto' as const,
}

export function AiSidebar() {
  const isAiSidebarOpen = useUnit($isAiSidebarOpen)

  if (!isAiSidebarOpen) {
    return null
  }

  return (
    <div role="complementary" aria-label="AI sidebar" style={aiSidebarStyle}>
      AI SIDEBAR
    </div>
  )
}
