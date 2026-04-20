import type * as React from 'react'

import { Box, Button } from '@/shared/ui/primitives'

export type TabsItem = {
  id: string
  label: string
  content?: React.ReactNode
}

export type TabsProps = {
  items: TabsItem[]
  value: string
  onChange: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
}

const rootStyle = {
  display: 'flex',
  gap: 'var(--gap-sm)',
}

const horizontalStyle = {
  flexDirection: 'column' as const,
}

const verticalStyle = {
  flexDirection: 'row' as const,
}

const tabListBaseStyle = {
  display: 'flex',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const horizontalTabListStyle = {
  flexDirection: 'row' as const,
}

const verticalTabListStyle = {
  flexDirection: 'column' as const,
  width: '220px',
}

const tabPanelStyle = {
  flex: 1,
  minWidth: 0,
}

export function Tabs({
  items,
  value,
  onChange,
  orientation = 'horizontal',
}: TabsProps) {
  const activeItem = items.find((item) => item.id === value) ?? items[0]

  return (
    <Box style={{ ...rootStyle, ...(orientation === 'vertical' ? verticalStyle : horizontalStyle) }}>
      <Box
        aria-orientation={orientation}
        role="tablist"
        style={{
          ...tabListBaseStyle,
          ...(orientation === 'vertical' ? verticalTabListStyle : horizontalTabListStyle),
        }}
      >
        {items.map((item) => (
          <Button
            aria-selected={item.id === activeItem?.id}
            key={item.id}
            onClick={() => onChange(item.id)}
            role="tab"
          >
            {item.label}
          </Button>
        ))}
      </Box>
      <Box role="tabpanel" style={tabPanelStyle}>
        {activeItem?.content ?? null}
      </Box>
    </Box>
  )
}
