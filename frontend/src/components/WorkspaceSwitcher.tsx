import { useEffect, useRef, useState } from 'react'

type WorkspaceSwitcherProps = {
  workspaceName: string
  repoRoot: string
  activeTabTitle: string
  activeWidgetTitle: string
  activeConnectionName: string
  onCreateTab: () => void | Promise<void>
  onOpenConnections: () => void
}

export function WorkspaceSwitcher({
  workspaceName,
  repoRoot,
  activeTabTitle,
  activeWidgetTitle,
  activeConnectionName,
  onCreateTab,
  onOpenConnections,
}: WorkspaceSwitcherProps) {
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
    <div className="workspace-switcher-shell" ref={rootRef}>
      <button
        className="workspace-switcher"
        title={workspaceName}
        onClick={() => setOpen((current) => !current)}
        type="button"
        aria-label={`Workspace switcher: ${workspaceName}`}
      >
        <span className="workspace-switcher-badge workspace-switcher-icon">WS</span>
      </button>
      {open ? (
        <div className="workspace-switcher-menu">
          <div className="workspace-switcher-card">
            <p className="eyebrow">Workspace</p>
            <strong>{workspaceName}</strong>
            <span className="workspace-switcher-subtitle">Current local workspace</span>
          </div>
          <div className="workspace-switcher-meta">
            <div>
              <span>Repository</span>
              <code>{repoRoot || 'discovering repo root…'}</code>
            </div>
            <div>
              <span>Active tab</span>
              <strong>{activeTabTitle}</strong>
            </div>
            <div>
              <span>Active widget</span>
              <strong>{activeWidgetTitle}</strong>
            </div>
            <div>
              <span>New tabs target</span>
              <strong>{activeConnectionName}</strong>
            </div>
          </div>
          <div className="workspace-switcher-actions">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void onCreateTab()
              }}
            >
              New terminal tab
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setOpen(false)
                onOpenConnections()
              }}
            >
              Connections
            </button>
          </div>
          <p className="workspace-switcher-note">
            Multi-workspace switching is still pending parity work. This popover preserves the TideTerm shell entry
            point without reviving the old frontend-owned workspace store.
          </p>
        </div>
      ) : null}
    </div>
  )
}
