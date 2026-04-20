import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DialogPopup } from '@/shared/ui/components/dialog-popup'

describe('DialogPopup', () => {
  it('renders default actions and dismisses through the footer action', () => {
    const onDismiss = vi.fn()

    render(
      <DialogPopup
        description="Review the current workspace settings."
        dismissLabel="Dismiss dialog"
        onDismiss={onDismiss}
        title="Workspace settings"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss dialog' }))

    expect(screen.getByText('Workspace settings')).toBeInTheDocument()
    expect(screen.getByText('Review the current workspace settings.')).toBeInTheDocument()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders the settings variant with confirm and icon close actions', () => {
    const onConfirm = vi.fn()
    const onDismiss = vi.fn()

    render(
      <DialogPopup
        confirmLabel="Apply changes"
        description="Body-scoped settings should stay on the wide layout."
        dismissLabel="Keep editing"
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        title="Settings"
        variant="settings"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }))

    expect(screen.getByText('Body-scoped settings should stay on the wide layout.')).toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
