import { useEffect, useRef, useState } from 'react'

import type { PolicyView } from './PolicyViews'
import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import { AppIcon, type AppIconName } from './icons/Icon'

type AgentHeaderMenuButtonProps = {
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
  onSelectPolicyView?: (view: PolicyView) => void
}

const menuSections = [
  { section: 'agent', icon: 'sparkles' as AppIconName },
  { section: 'launcher', icon: 'cube' as AppIconName },
  { section: 'connections', icon: 'plug' as AppIconName },
  { section: 'tools', icon: 'terminal' as AppIconName },
  { section: 'policy', icon: 'cog' as AppIconName },
  { section: 'audit', icon: 'clock' as AppIconName },
] as const satisfies { section: ShellSection; icon: AppIconName }[]

export function AgentHeaderMenuButton({ section, onSelectSection, onSelectPolicyView }: AgentHeaderMenuButtonProps) {
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
        <AppIcon name="ellipsis-vertical" size={0.88} />
      </button>
      {open ? (
        <div className="agent-header-menu agent-header-menu--compact">
          {menuSections.map(({ section: entry, icon }) => (
            <button
              key={entry}
              type="button"
              className={`agent-header-menu-item ${entry === section ? 'active' : ''}`}
              title={SHELL_SECTION_LABELS[entry]}
              aria-label={SHELL_SECTION_LABELS[entry]}
              onClick={() => {
                setOpen(false)
                if (entry === 'policy' && onSelectPolicyView) {
                  onSelectPolicyView('overview')
                  return
                }
                onSelectSection(entry)
              }}
            >
              <span className="agent-header-menu-item-icon">
                <AppIcon name={icon} size={0.85} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
