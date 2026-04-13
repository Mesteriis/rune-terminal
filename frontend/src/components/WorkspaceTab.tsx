import { useEffect, useRef, useState } from 'react'

import type { Tab } from '../types'

type WorkspaceTabProps = {
  tab: Tab
  active: boolean
  onSelect: () => void | Promise<void>
  onClose: () => void | Promise<void>
  onRename: (title: string) => void | Promise<void>
  onTogglePinned: () => void | Promise<void>
}

export function WorkspaceTab({ tab, active, onSelect, onClose, onRename, onTogglePinned }: WorkspaceTabProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(tab.title)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editing) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function commitRename() {
    const nextTitle = draftTitle.trim()
    setEditing(false)
    if (!nextTitle || nextTitle === tab.title) {
      setDraftTitle(tab.title)
      return
    }
    void onRename(nextTitle)
  }

  return (
    <div
      className={['workspace-tab', active ? 'active' : '', tab.pinned ? 'pinned' : ''].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      onClick={() => void onSelect()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void onSelect()
        }
      }}
    >
      <button
        type="button"
        className={tab.pinned ? 'workspace-tab-pin active' : 'workspace-tab-pin'}
        onClick={(event) => {
          event.stopPropagation()
          void onTogglePinned()
        }}
        title={tab.pinned ? 'Unpin tab' : 'Pin tab'}
      >
        📌
      </button>
      <div className="workspace-tab-copy">
        {editing ? (
          <input
            ref={inputRef}
            className="workspace-tab-editor"
            value={draftTitle}
            aria-label="Rename tab"
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitRename}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitRename()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                setDraftTitle(tab.title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <strong
            onDoubleClick={(event) => {
              event.stopPropagation()
              setDraftTitle(tab.title)
              setEditing(true)
            }}
          >
            {tab.title}
          </strong>
        )}
        <span>{tab.description ?? tab.widget_ids.join(', ')}</span>
      </div>
      <button
        type="button"
        className="workspace-tab-close"
        onClick={(event) => {
          event.stopPropagation()
          void onClose()
        }}
        title="Close tab"
      >
        ×
      </button>
    </div>
  )
}
