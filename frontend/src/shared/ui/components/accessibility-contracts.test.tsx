import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InputField } from '@/shared/ui/components/input-field'
import { RadioGroup } from '@/shared/ui/components/radio-group'
import { SearchableMultiSelect } from '@/shared/ui/components/searchable-multi-select'
import { TerminalToolbar } from '@/shared/ui/components/terminal-toolbar'
import { ShellTopbarWidget } from '@/widgets/shell/shell-topbar-widget'

describe('frontend accessibility contracts', () => {
  it('renders multiselect options as listbox options with aria-selected state', () => {
    const onChange = vi.fn()

    render(
      <SearchableMultiSelect
        label="Workspace tabs"
        onChange={onChange}
        options={[
          { value: 'tool', label: 'Tool' },
          { value: 'ai', label: 'AI' },
        ]}
        value={['ai']}
      />,
    )

    const listbox = screen.getByRole('listbox', { name: 'Workspace tabs' })
    const options = screen.getAllByRole('option')

    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(options[0]!)

    expect(onChange).toHaveBeenCalledWith(['ai', 'tool'])
  })

  it('exposes a labelled radiogroup', () => {
    render(
      <RadioGroup
        label="Renderer mode"
        name="renderer-mode"
        onChange={() => undefined}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'webgl', label: 'WebGL' },
        ]}
        value="default"
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Renderer mode' })).toBeInTheDocument()
  })

  it('focuses the terminal search input when search opens', () => {
    render(
      <TerminalToolbar
        isSearchOpen
        onCloseSearch={() => undefined}
        onCopy={() => undefined}
        onPaste={() => undefined}
        onSearchNext={() => undefined}
        onSearchPrevious={() => undefined}
        onSearchQueryChange={() => undefined}
        onToggleSearch={() => undefined}
        rendererMode="default"
        searchQuery=""
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Search terminal output' })).toHaveFocus()
  })

  it('binds input labels to their corresponding textboxes', () => {
    render(<InputField label="Name" placeholder="Type here" />)

    expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Type here')
  })

  it('keeps shell window actions as buttons outside the workspace tablist', () => {
    render(
      <ShellTopbarWidget
        activeWorkspaceId={2}
        isAiOpen={false}
        onAddWorkspace={() => undefined}
        onSelectWorkspace={() => undefined}
        onToggleAi={() => undefined}
        workspaceTabs={[
          { id: 1, title: 'Workspace-1' },
          { id: 2, title: 'Workspace-2' },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Close window' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Close window' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })
})
