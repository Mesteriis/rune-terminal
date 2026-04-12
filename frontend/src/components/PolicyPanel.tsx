import { useState } from 'react'

import type { IgnoreRule, TrustedRule } from '../types'

type PolicyPanelProps = {
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<void>
}

export function PolicyPanel({ trustedRules, ignoreRules, onExecuteTool }: PolicyPanelProps) {
  const [trustedMatcher, setTrustedMatcher] = useState('term.send_input')
  const [trustedScope, setTrustedScope] = useState('repo')
  const [ignorePattern, setIgnorePattern] = useState('.env*')
  const [ignoreMode, setIgnoreMode] = useState('metadata-only')

  return (
    <>
      <section className="panel">
        <p className="eyebrow">Trusted rules</p>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onExecuteTool({
              tool_name: 'safety.add_trusted_rule',
              input: {
                scope: trustedScope,
                subject_type: 'tool',
                matcher_type: 'exact',
                matcher: trustedMatcher,
                note: 'MVP policy console',
              },
            })
          }}
        >
          <label>
            Scope
            <select value={trustedScope} onChange={(event) => setTrustedScope(event.target.value)}>
              <option value="global">global</option>
              <option value="workspace">workspace</option>
              <option value="repo">repo</option>
            </select>
          </label>
          <label>
            Tool matcher
            <input value={trustedMatcher} onChange={(event) => setTrustedMatcher(event.target.value)} />
          </label>
          <button type="submit">Add trusted rule</button>
        </form>

        <ul className="rule-list">
          {trustedRules.map((rule) => (
            <li key={rule.id}>
              <code>{rule.matcher ?? 'structured'}</code>
              <span>{rule.scope}</span>
              <button
                onClick={() =>
                  void onExecuteTool({
                    tool_name: 'safety.remove_trusted_rule',
                    input: { rule_id: rule.id },
                  })
                }
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <p className="eyebrow">Ignore rules</p>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onExecuteTool({
              tool_name: 'safety.add_ignore_rule',
              input: {
                scope: 'repo',
                matcher_type: 'glob',
                pattern: ignorePattern,
                mode: ignoreMode,
                note: 'MVP secret shield',
              },
            })
          }}
        >
          <label>
            Pattern
            <input value={ignorePattern} onChange={(event) => setIgnorePattern(event.target.value)} />
          </label>
          <label>
            Mode
            <select value={ignoreMode} onChange={(event) => setIgnoreMode(event.target.value)}>
              <option value="deny">deny</option>
              <option value="metadata-only">metadata-only</option>
              <option value="redact">redact</option>
            </select>
          </label>
          <button type="submit">Add ignore rule</button>
        </form>

        <ul className="rule-list">
          {ignoreRules.map((rule) => (
            <li key={rule.id}>
              <code>{rule.pattern}</code>
              <span>{rule.mode}</span>
              <button
                onClick={() =>
                  void onExecuteTool({
                    tool_name: 'safety.remove_ignore_rule',
                    input: { rule_id: rule.id },
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
