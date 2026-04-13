import { useEffect, useRef, useState } from 'react'

type MenuItem = {
  label: string
  detail: string
  onSelect: () => void | Promise<void>
}

type WidgetDockMenuButtonProps = {
  label: string
  title: string
  items: MenuItem[]
}

export function WidgetDockMenuButton({ label, title, items }: WidgetDockMenuButtonProps) {
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
        className={open ? 'widget-dock-mini active' : 'widget-dock-mini'}
        title={title}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <div className="widget-dock-menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                void item.onSelect()
              }}
            >
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
