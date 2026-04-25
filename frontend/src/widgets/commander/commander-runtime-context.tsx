import type { RuntimeContext } from '@/shared/api/runtime'
import { Box, Surface } from '@/shared/ui/primitives'

import {
  commanderRuntimeContextGridStyle,
  commanderRuntimeContextItemStyle,
  commanderRuntimeContextLabelStyle,
  commanderRuntimeContextStyle,
  commanderRuntimeContextValueStyle,
} from '@/widgets/commander/commander-shell.styles'

type CommanderRuntimeContextProps = {
  runtimeContext: RuntimeContext
}

function renderValue(value: string) {
  return value.trim() ? value : 'Unavailable'
}

/** Renders a bounded backend-owned shell/runtime summary for commander. */
export function CommanderRuntimeContext({ runtimeContext }: CommanderRuntimeContextProps) {
  return (
    <Surface runaComponent="commander-runtime-context" style={commanderRuntimeContextStyle}>
      <Box runaComponent="commander-runtime-context-grid" style={commanderRuntimeContextGridStyle}>
        <Box runaComponent="commander-runtime-context-shell" style={commanderRuntimeContextItemStyle}>
          <Box
            runaComponent="commander-runtime-context-shell-label"
            style={commanderRuntimeContextLabelStyle}
          >
            Shell
          </Box>
          <Box
            runaComponent="commander-runtime-context-shell-value"
            style={commanderRuntimeContextValueStyle}
          >
            {renderValue(runtimeContext.defaultShell)}
          </Box>
        </Box>
        <Box runaComponent="commander-runtime-context-term" style={commanderRuntimeContextItemStyle}>
          <Box runaComponent="commander-runtime-context-term-label" style={commanderRuntimeContextLabelStyle}>
            TERM
          </Box>
          <Box runaComponent="commander-runtime-context-term-value" style={commanderRuntimeContextValueStyle}>
            {renderValue(runtimeContext.term)}
          </Box>
        </Box>
        <Box runaComponent="commander-runtime-context-color-term" style={commanderRuntimeContextItemStyle}>
          <Box
            runaComponent="commander-runtime-context-color-term-label"
            style={commanderRuntimeContextLabelStyle}
          >
            COLORTERM
          </Box>
          <Box
            runaComponent="commander-runtime-context-color-term-value"
            style={commanderRuntimeContextValueStyle}
          >
            {renderValue(runtimeContext.colorTerm)}
          </Box>
        </Box>
        <Box runaComponent="commander-runtime-context-root" style={commanderRuntimeContextItemStyle}>
          <Box runaComponent="commander-runtime-context-root-label" style={commanderRuntimeContextLabelStyle}>
            Workspace root
          </Box>
          <Box runaComponent="commander-runtime-context-root-value" style={commanderRuntimeContextValueStyle}>
            {renderValue(runtimeContext.repoRoot)}
          </Box>
        </Box>
      </Box>
    </Surface>
  )
}
