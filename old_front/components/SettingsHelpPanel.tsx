import type { PolicyView } from './PolicyViews'
import type { ShellSection } from './ShellSections'

type SettingsHelpPanelProps = {
  onSelectView: (view: PolicyView) => void
  onSelectSection: (section: ShellSection) => void
}

export function SettingsHelpPanel({ onSelectView, onSelectSection }: SettingsHelpPanelProps) {
  return (
    <section className="policy-surface-card">
      <div className="policy-surface-copy">
        <p className="eyebrow">Help and controls</p>
        <h2>Shell utilities</h2>
        <p>
          These surfaces stay secondary to the terminal and AI panel, but they should remain easy to reach from the
          dock, just like TideTerm’s settings and help affordances.
        </p>
      </div>

      <div className="policy-help-grid">
        <button type="button" className="policy-help-card" onClick={() => onSelectView('overview')}>
          <strong>Settings overview</strong>
          <span>Return to the shell settings overview and trust/privacy summary.</span>
        </button>
        <button type="button" className="policy-help-card" onClick={() => onSelectSection('tools')}>
          <strong>Runtime utilities</strong>
          <span>Open the internal runtime console and inspect tool metadata.</span>
        </button>
        <button type="button" className="policy-help-card" onClick={() => onSelectSection('audit')}>
          <strong>Audit trail</strong>
          <span>Review recent runtime operations, approvals, and policy outcomes.</span>
        </button>
      </div>

      <div className="policy-help-note">
        <strong>Current MVP compromise</strong>
        <span>
          Broader TideTerm settings surfaces are still pending. This shell currently exposes the control surfaces that
          matter for runtime safety, privacy, and operator visibility.
        </span>
      </div>
    </section>
  )
}
