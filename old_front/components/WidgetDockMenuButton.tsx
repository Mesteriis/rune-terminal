import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { AppIcon, type AppIconName } from './icons/Icon'

type MenuItem = {
  label: string
  detail: string
  icon: AppIconName
  onSelect: () => void | Promise<void>
}

type WidgetDockMenuButtonProps = {
  label: ReactNode
  title: string
  items: MenuItem[]
  compact?: boolean
  active?: boolean
}

export function WidgetDockMenuButton({ label, title, items, compact = false, active = false }: WidgetDockMenuButtonProps) {
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
    <div className="widget-dock-menu-shell" ref={rootRef}>
      <button
        type="button"
        className={open || active ? 'widget-dock-mini active' : 'widget-dock-mini'}
        title={title}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
          <div className={`widget-dock-menu${compact ? ' widget-dock-menu--compact' : ''}`}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={compact ? 'widget-dock-menu-item widget-dock-menu-item--compact' : 'widget-dock-menu-item'}
              title={item.detail}
              aria-label={item.label}
              onClick={() => {
                setOpen(false)
                void item.onSelect()
              }}
            >
              <span className="widget-dock-menu-item-icon">
                <AppIcon name={item.icon} size={0.82} />
              </span>
              {!compact ? (
                <span className="widget-dock-menu-item-copy">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
