import { useEffect, useRef, useState } from 'react'
import { AppIcon } from './icons/Icon'

import type { Tab } from '../types'

type WorkspaceTabProps = {
  tab: Tab
  active: boolean
  onSelect: () => void | Promise<void>
  onClose: () => void | Promise<void>
  onRename: (title: string) => void | Promise<void>
  onTogglePinned: () => void | Promise<void>
  dragging: boolean
  dropTarget: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDropTab: () => void
}

export function WorkspaceTab({
  tab,
  active,
  onSelect,
  onClose,
  onRename,
  onTogglePinned,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDropTab,
}: WorkspaceTabProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(tab.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const tabRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editing) {
      return
    }
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    function handlePointerDown(event: MouseEvent) {
      if (!tabRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

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
      ref={tabRef}
      className={['workspace-tab', active ? 'active' : '', tab.pinned ? 'pinned' : '', dragging ? 'dragging' : '', dropTarget ? 'drop-target' : '']
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', tab.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDragEnter={(event) => {
        event.preventDefault()
        onDragEnter()
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDropTab()
      }}
      onClick={() => void onSelect()}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setMenuPosition({ x: event.clientX, y: event.clientY })
        setMenuOpen(true)
      }}
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
        <AppIcon name="pin" size={0.78} />
      </button>
      <div className="workspace-tab-copy">
        {editing ? (
          <input
            ref={inputRef}
            className="workspace-tab-editor"
            value={draftTitle}
            aria-label="Rename tab"
            draggable={false}
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
        <AppIcon name="x" size={0.68} />
      </button>
      {menuOpen ? (
        <div
          className="workspace-tab-menu"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              void onTogglePinned()
            }}
          >
            {tab.pinned ? 'Unpin tab' : 'Pin tab'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setDraftTitle(tab.title)
              setEditing(true)
            }}
          >
            Rename tab
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              void onClose()
            }}
          >
            Close tab
          </button>
        </div>
      ) : null}
    </div>
  )
}
