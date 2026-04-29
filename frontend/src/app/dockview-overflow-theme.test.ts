import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('dockview overflow theme contract', () => {
  it('keeps the active overflow popup behind shell theme tokens', () => {
    const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')
    const overflowBlock = css.match(/\.runa-dockview-theme \.dv-tabs-overflow-container\s*\{[^}]+}/)?.[0]

    expect(overflowBlock).toBeDefined()
    expect(overflowBlock).toContain('var(--runa-dockview-overflow-bg)')
    expect(overflowBlock).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/)
  })
})
