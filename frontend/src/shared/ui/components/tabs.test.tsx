import * as React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Tabs } from '@/shared/ui/components/tabs'

const tabItems = [
  {
    id: 'tool',
    label: 'Tool',
    content: 'Tool content',
  },
  {
    id: 'ai',
    label: 'AI',
    content: 'AI content',
  },
]

function TabsHarness({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const [value, setValue] = React.useState('tool')

  return <Tabs items={tabItems} onChange={setValue} orientation={orientation} value={value} />
}

describe('Tabs', () => {
  it('renders the active panel and switches selection after click', () => {
    render(<TabsHarness />)

    expect(screen.getByRole('tab', { name: 'Tool' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Tool content')

    fireEvent.click(screen.getByRole('tab', { name: 'AI' }))

    expect(screen.getByRole('tab', { name: 'AI' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tool' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('AI content')
  })

  it('exposes the vertical tablist orientation contract', () => {
    render(<TabsHarness orientation="vertical" />)

    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
  })
})
