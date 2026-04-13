import { useMemo, useState } from 'react'

import type { PolicyView } from './PolicyViews'
import type { ShellSection } from './ShellSections'
import { buildLauncherEntries } from '../lib/launcherCatalog'
import type { Widget, Workspace } from '../types'

type LauncherPanelProps = {
  workspace: Workspace | null
  onCreateTerminalTab: () => void | Promise<void>
  onFocusWidget: (widget: Widget) => void | Promise<void>
  onSelectSection: (section: ShellSection, options?: { policyView?: PolicyView }) => void
}

export function LauncherPanel({
  workspace,
  onCreateTerminalTab,
  onFocusWidget,
  onSelectSection,
}: LauncherPanelProps) {
  const [search, setSearch] = useState('')
  const entries = useMemo(() => buildLauncherEntries(workspace), [workspace])
  const filteredEntries = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) {
      return entries
    }
    return entries.filter((entry) =>
      `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(normalized),
    )
  }, [entries, search])

  const sections = useMemo(
    () =>
      [
        { key: 'create', title: 'Create' },
        { key: 'workspace', title: 'Workspace surfaces' },
        { key: 'utility', title: 'Utilities' },
      ] as const,
    [],
  )

  return (
    <section className="panel launcher-panel">
      <div className="launcher-panel-header">
        <p className="eyebrow">Launcher</p>
        <h2>Open something</h2>
        <span>Discover shell surfaces, open a fresh terminal, or jump directly to an existing widget.</span>
      </div>

      <label className="launcher-search">
        <span>Search surfaces</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search widgets, settings, audit, help…"
        />
      </label>

      <div className="launcher-panel-body">
        {sections.map((section) => {
          const sectionEntries = filteredEntries.filter((entry) => entry.category === section.key)
          if (sectionEntries.length === 0) {
            return null
          }
          return (
            <div key={section.key} className="launcher-section">
              <div className="launcher-section-header">
                <strong>{section.title}</strong>
                <span>{sectionEntries.length} item{sectionEntries.length === 1 ? '' : 's'}</span>
              </div>
              <div className="launcher-grid">
                {sectionEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="launcher-card"
                    onClick={() => void runEntry(entry)}
                  >
                    <span className="launcher-card-icon">
                      <i className={`fa ${entry.icon}`} />
                    </span>
                    <strong>{entry.title}</strong>
                    <small>{entry.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {filteredEntries.length === 0 ? (
          <div className="launcher-empty">
            <strong>No matches</strong>
            <span>Clear the search field to see every available shell surface again.</span>
          </div>
        ) : null}
      </div>
    </section>
  )

  async function runEntry(entry: ReturnType<typeof buildLauncherEntries>[number]) {
    switch (entry.action.type) {
      case 'create-terminal':
        await onCreateTerminalTab()
        return
      case 'focus-widget':
        await onFocusWidget(entry.action.widget)
        return
      case 'open-section':
        onSelectSection(entry.action.section, { policyView: entry.action.policyView })
    }
  }
}
