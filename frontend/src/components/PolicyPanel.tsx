import { IgnoreRulesManager } from './IgnoreRulesManager'
import { POLICY_VIEW_LABELS, type PolicyView } from './PolicyViews'
import { PolicyOverviewCard } from './PolicyOverviewCard'
import { SettingsHelpPanel } from './SettingsHelpPanel'
import type { ShellSection } from './ShellSections'
import { TrustedRulesManager } from './TrustedRulesManager'
import type { IgnoreRule, TrustedRule } from '../types'

type PolicyPanelProps = {
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  view: PolicyView
  onSelectView: (view: PolicyView) => void
  onSelectSection: (section: ShellSection) => void
  onAddTrustedRule: (input: { scope: string; matcher: string; note?: string }) => void | Promise<unknown>
  onRemoveTrustedRule: (ruleId: string) => void | Promise<unknown>
  onAddIgnoreRule: (input: { pattern: string; mode: string; note?: string }) => void | Promise<unknown>
  onRemoveIgnoreRule: (ruleId: string) => void | Promise<unknown>
}

const POLICY_VIEWS: PolicyView[] = ['overview', 'trusted', 'ignore', 'help']

export function PolicyPanel({
  trustedRules,
  ignoreRules,
  view,
  onSelectView,
  onSelectSection,
  onAddTrustedRule,
  onRemoveTrustedRule,
  onAddIgnoreRule,
  onRemoveIgnoreRule,
}: PolicyPanelProps) {
  return (
    <section className="panel policy-panel">
      <div className="policy-panel-header">
        <p className="eyebrow">Settings and controls</p>
        <h2>Shell settings</h2>
        <span>Trust, privacy, and shell utility surfaces stay reachable from the widget dock.</span>
      </div>

      <div className="policy-tab-strip">
        {POLICY_VIEWS.map((entry) => (
          <button
            key={entry}
            type="button"
            className={entry === view ? 'policy-tab active' : 'policy-tab'}
            onClick={() => onSelectView(entry)}
          >
            {POLICY_VIEW_LABELS[entry]}
          </button>
        ))}
      </div>

      <div className="policy-panel-body">
        {view === 'overview' ? (
          <PolicyOverviewCard trustedRules={trustedRules} ignoreRules={ignoreRules} onSelectView={onSelectView} />
        ) : null}
        {view === 'trusted' ? (
          <TrustedRulesManager
            trustedRules={trustedRules}
            onAddRule={onAddTrustedRule}
            onRemoveRule={onRemoveTrustedRule}
          />
        ) : null}
        {view === 'ignore' ? (
          <IgnoreRulesManager ignoreRules={ignoreRules} onAddRule={onAddIgnoreRule} onRemoveRule={onRemoveIgnoreRule} />
        ) : null}
        {view === 'help' ? (
          <SettingsHelpPanel onSelectView={onSelectView} onSelectSection={onSelectSection} />
        ) : null}
      </div>
    </section>
  )
}
