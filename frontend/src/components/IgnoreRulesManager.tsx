import { useState } from 'react'

import type { IgnoreRule } from '../types'

type IgnoreRulesManagerProps = {
  ignoreRules: IgnoreRule[]
  onAddRule: (input: { pattern: string; mode: string; note?: string }) => void | Promise<unknown>
  onRemoveRule: (ruleId: string) => void | Promise<unknown>
}

export function IgnoreRulesManager({ ignoreRules, onAddRule, onRemoveRule }: IgnoreRulesManagerProps) {
  const [pattern, setPattern] = useState('.env*')
  const [mode, setMode] = useState('metadata-only')

  return (
    <section className="policy-surface-card">
      <div className="policy-surface-copy">
        <p className="eyebrow">Secret shield</p>
        <h2>Protected paths</h2>
        <p>
          Ignore rules prevent the runtime and AI tools from reading sensitive files. Use metadata-only when the shell
          can reveal file presence, and deny when the file should stay completely out of reach.
        </p>
      </div>

      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onAddRule({
            pattern,
            mode,
            note: 'Settings surface',
          })
        }}
      >
        <label>
          Pattern
          <input value={pattern} onChange={(event) => setPattern(event.target.value)} />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="deny">deny</option>
            <option value="metadata-only">metadata-only</option>
            <option value="redact">redact</option>
          </select>
        </label>
        <button type="submit">Add ignore rule</button>
      </form>

      <ul className="rule-list">
        {ignoreRules.length === 0 ? <li className="rule-empty">No protected-path rules yet.</li> : null}
        {ignoreRules.map((rule) => (
          <li key={rule.id}>
            <div className="rule-copy">
              <strong>{rule.pattern}</strong>
              <span>{rule.mode}</span>
              <small>{rule.note ?? 'Protected path rule'}</small>
            </div>
            <button type="button" className="ghost-button" onClick={() => void onRemoveRule(rule.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
