import type * as React from 'react'

import {
  tabsHorizontalLayoutStyle,
  tabsHorizontalListStyle,
  tabsListBaseStyle,
  tabsPanelStyle,
  tabsRootStyle,
  tabsVerticalLayoutStyle,
  tabsVerticalListStyle,
} from '@/shared/ui/components/tabs.styles'
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

export function Tabs({ items, value, onChange, orientation = 'horizontal' }: TabsProps) {
  const activeItem = items.find((item) => item.id === value) ?? items[0]

  return (
    <Box
      style={{
        ...tabsRootStyle,
        ...(orientation === 'vertical' ? tabsVerticalLayoutStyle : tabsHorizontalLayoutStyle),
      }}
    >
      <Box
        aria-orientation={orientation}
        role="tablist"
        style={{
          ...tabsListBaseStyle,
          ...(orientation === 'vertical' ? tabsVerticalListStyle : tabsHorizontalListStyle),
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
      <Box role="tabpanel" style={tabsPanelStyle}>
        {activeItem?.content ?? null}
      </Box>
    </Box>
  )
}
