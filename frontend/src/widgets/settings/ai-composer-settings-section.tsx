import type { ReactNode } from 'react'

import { RadioGroup, ClearBox } from '@/shared/ui/components'
import { Text } from '@/shared/ui/primitives'
import { useAiComposerPreferences } from '@/features/agent/model/use-ai-composer-preferences'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </ClearBox>
      {children}
    </ClearBox>
  )
}

export function AiComposerSettingsSection() {
  const { submitMode, updateSubmitMode, isLoading, isSaving, errorMessage } = useAiComposerPreferences()

  return (
    <SectionCard
      description="Runtime-backed keyboard behavior for the AI composer. The selected send/newline shortcut is now stored in the shared runtime settings contract."
      title="Keyboard submit behavior"
    >
      <ClearBox style={settingsShellListStyle}>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>Current mode</Text>
            <Text style={settingsShellMutedTextStyle}>
              {submitMode === 'enter-sends'
                ? 'Enter sends the prompt; Shift+Enter inserts a new line.'
                : 'Enter inserts a new line; Ctrl/Cmd+Enter sends the prompt.'}
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? 'Loading' : isSaving ? 'Saving' : 'Runtime'}
          </ClearBox>
        </ClearBox>
      </ClearBox>

      <RadioGroup
        label="Composer submit shortcut"
        name="ai-composer-submit-mode"
        onChange={(value) =>
          updateSubmitMode(value === 'mod-enter-sends' ? 'mod-enter-sends' : 'enter-sends')
        }
        options={[
          {
            value: 'enter-sends',
            label: 'Enter sends',
            description: 'Shift+Enter inserts a new line.',
          },
          {
            value: 'mod-enter-sends',
            label: 'Ctrl/Cmd+Enter sends',
            description: 'Plain Enter inserts a new line.',
          },
        ]}
        value={submitMode}
        disabled={isLoading || isSaving}
      />

      <Text style={settingsShellMutedTextStyle}>
        This preference is stored in the runtime DB and applies immediately to the AI composer.
      </Text>
      {errorMessage ? <Text style={settingsShellMutedTextStyle}>{errorMessage}</Text> : null}
    </SectionCard>
  )
}
