import type { PolicyView } from './PolicyViews'
import type { IgnoreRule, TrustedRule } from '../types'

type PolicyOverviewCardProps = {
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  onSelectView: (view: PolicyView) => void
}

export function PolicyOverviewCard({ trustedRules, ignoreRules, onSelectView }: PolicyOverviewCardProps) {
  const enabledTrusted = trustedRules.filter((rule) => rule.enabled).length
  const enabledIgnore = ignoreRules.filter((rule) => rule.enabled).length

  return (
    <section className="policy-overview-card">
      <div className="policy-overview-copy">
        <p className="eyebrow">Settings and privacy</p>
        <h2>Shell controls</h2>
        <p>
          RunaTerminal keeps trust, secret shielding, and runtime controls in one shell-level surface. These rules
          apply before tool execution reaches the Go runtime.
        </p>
      </div>

      <div className="policy-overview-grid">
        <button type="button" className="policy-overview-stat" onClick={() => onSelectView('trusted')}>
          <strong>{enabledTrusted}</strong>
          <span>Trusted tool rules</span>
          <small>Manage commands that can skip repeated confirmation</small>
        </button>
        <button type="button" className="policy-overview-stat" onClick={() => onSelectView('ignore')}>
          <strong>{enabledIgnore}</strong>
          <span>Secret shield rules</span>
          <small>Hide or deny sensitive files before they reach the agent</small>
        </button>
      </div>

      <div className="policy-overview-links">
        <button type="button" className="ghost-button" onClick={() => onSelectView('trusted')}>
          Review trusted tools
        </button>
        <button type="button" className="ghost-button" onClick={() => onSelectView('ignore')}>
          Review secret shield
        </button>
        <button type="button" className="ghost-button" onClick={() => onSelectView('help')}>
          Open help
        </button>
      </div>
    </section>
  )
}
