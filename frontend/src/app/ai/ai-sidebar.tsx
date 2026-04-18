import type { CSSProperties } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen } from '../../shared/model/app'

type AiSidebarProps = {
  width: number
}

function getAiSidebarStyle(width: number): CSSProperties {
  return {
    flex: `0 0 ${width}px`,
    width,
    display: 'flex',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    padding: 16,
    overflow: 'auto',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #000000',
  }
}

export function AiSidebar({ width }: AiSidebarProps) {
  const isAiSidebarOpen = useUnit($isAiSidebarOpen)

  if (!isAiSidebarOpen) {
    return null
  }

  return (
    <div
      role="complementary"
      aria-label="AI sidebar"
      style={getAiSidebarStyle(width)}
    >
      AI SIDEBAR
    </div>
  )
}
