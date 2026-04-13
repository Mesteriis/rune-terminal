import { useEffect, useRef, useState } from 'react'

import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'

type AgentHeaderMenuButtonProps = {
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
}

export function AgentHeaderMenuButton({ section, onSelectSection }: AgentHeaderMenuButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div className="agent-header-menu-shell" ref={rootRef}>
      <button
        type="button"
        className={open ? 'agent-header-menu-button active' : 'agent-header-menu-button'}
        title="AI panel options"
        onClick={() => setOpen((current) => !current)}
      >
        <i className="fa fa-ellipsis-vertical" />
      </button>
      {open ? (
        <div className="agent-header-menu">
          {(['agent', 'launcher', 'tools', 'policy', 'audit'] as ShellSection[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className={entry === section ? 'active' : ''}
              onClick={() => {
                setOpen(false)
                onSelectSection(entry)
              }}
            >
              <strong>{SHELL_SECTION_LABELS[entry]}</strong>
              <span>
                {entry === 'agent'
                  ? 'Open the AI chat and posture surface'
                  : entry === 'launcher'
                    ? 'Open the shell launcher and widget catalog'
                  : entry === 'tools'
                    ? 'Open runtime utilities and tool inspection'
                    : entry === 'policy'
                      ? 'Open settings, trust, and secret shield controls'
                      : 'Inspect recent runtime and approval events'}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
