import { useState } from 'react'

import type { TrustedRule } from '../types'

type TrustedRulesManagerProps = {
  trustedRules: TrustedRule[]
  onAddRule: (input: { scope: string; matcher: string; note?: string }) => void | Promise<unknown>
  onRemoveRule: (ruleId: string) => void | Promise<unknown>
}

export function TrustedRulesManager({ trustedRules, onAddRule, onRemoveRule }: TrustedRulesManagerProps) {
  const [matcher, setMatcher] = useState('term.send_input')
  const [scope, setScope] = useState('repo')

  return (
    <section className="policy-surface-card">
      <div className="policy-surface-copy">
        <p className="eyebrow">Trusted tools</p>
        <h2>Approved repeat actions</h2>
        <p>
          Trusted rules let known-safe tool calls skip repeated confirmation inside the current repo, workspace, or
          global shell scope.
        </p>
      </div>

      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onAddRule({
            scope,
            matcher,
            note: 'Settings surface',
          })
        }}
      >
        <label>
          Scope
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="global">global</option>
            <option value="workspace">workspace</option>
            <option value="repo">repo</option>
          </select>
        </label>
        <label>
          Tool matcher
          <input value={matcher} onChange={(event) => setMatcher(event.target.value)} />
        </label>
        <button type="submit">Add trusted rule</button>
      </form>

      <ul className="rule-list">
        {trustedRules.length === 0 ? <li className="rule-empty">No trusted rules yet.</li> : null}
        {trustedRules.map((rule) => (
          <li key={rule.id}>
            <div className="rule-copy">
              <strong>{rule.matcher ?? 'structured rule'}</strong>
              <span>{rule.scope}</span>
              <small>{rule.note ?? 'Trusted tool rule'}</small>
            </div>
            <button type="button" className="ghost-button" onClick={() => void onRemoveRule(rule.id)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
