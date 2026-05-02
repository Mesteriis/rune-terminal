import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const rawColorPattern = /#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/

function source(path: string) {
  return readFileSync(`${process.cwd()}/${path}`, 'utf8')
}

describe('frontend style theme contracts', () => {
  it('keeps audited component/widget files free of raw color literals', () => {
    const files = [
      'src/shared/ui/components/terminal-surface.tsx',
      'src/shared/ui/components/terminal-status-header.tsx',
      'src/shared/ui/components/terminal-status-header.styles.ts',
      'src/widgets/terminal/terminal-widget.styles.ts',
      'src/widgets/panel/widget-busy-overlay-widget.styles.ts',
      'src/widgets/panel/widget-busy-overlay-widget.tsx',
      'src/widgets/panel/widget-busy-marker.tsx',
      'src/widgets/settings/settings-shell-widget.tsx',
      'src/widgets/settings/plugins-settings-section.tsx',
      'src/widgets/settings/runtime-settings-section.tsx',
      'src/widgets/settings/mcp-settings-section.tsx',
      'src/widgets/settings/remote-profiles-settings-section.tsx',
      'src/widgets/settings/agent-provider-settings-widget.styles.ts',
    ]

    for (const file of files) {
      expect(source(file), file).not.toMatch(rawColorPattern)
    }
  })

  it('defines token-owned palettes for terminal and busy surfaces', () => {
    const tokens = source('src/shared/ui/tokens/index.css')

    expect(tokens).toContain('--runa-terminal-ansi-red')
    expect(tokens).toContain('--runa-terminal-contrast-background')
    expect(tokens).toContain('--runa-busy-particle-primary')
  })
})
