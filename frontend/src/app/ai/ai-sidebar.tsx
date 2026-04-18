import type { CSSProperties } from 'react'
import { useUnit } from 'effector-react'

import { $isAiSidebarOpen } from '../../shared/model/app'

const aiSidebarStyle: CSSProperties = {
  flex: '0 0 50%',
  width: '50%',
  display: 'flex',
  alignItems: 'flex-start',
  boxSizing: 'border-box',
  padding: 16,
  overflow: 'auto',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #000000',
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
