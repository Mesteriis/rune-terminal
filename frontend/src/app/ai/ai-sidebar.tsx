import type { CSSProperties } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen } from '../../shared/model/app'

const aiSidebarStyle: CSSProperties = {
  position: 'absolute',
  top: 40,
  right: 0,
  bottom: 0,
  width: 300,
  zIndex: 20,
  pointerEvents: 'auto' as const,
}

export function AiSidebar() {
  const isAiSidebarOpen = useUnit($isAiSidebarOpen)

  if (!isAiSidebarOpen) {
    return null
  }

  return <div style={aiSidebarStyle}>AI SIDEBAR</div>
}
