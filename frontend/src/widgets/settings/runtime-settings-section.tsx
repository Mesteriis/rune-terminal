import type { ReactNode } from 'react'

import { RadioGroup, ClearBox } from '@/shared/ui/components'
import { Button, Text } from '@/shared/ui/primitives'
import { useRuntimeSettings } from '@/features/runtime/model/use-runtime-settings'
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

function watcherModeLabel(mode: 'ephemeral' | 'persistent') {
  return mode === 'persistent' ? 'Persistent' : 'Ephemeral'
}

function shutdownBehaviorText(mode: 'ephemeral' | 'persistent') {
  return mode === 'persistent'
    ? 'Closing the desktop window detaches from the runtime and leaves it running.'
    : 'Closing the desktop window stops the owned runtime after the active-task guard passes.'
}

export function RuntimeSettingsSection() {
  const {
    canPersistWatcherMode,
    errorMessage,
    isLoading,
    isSaving,
    refresh,
    runtimeContext,
    updateWatcherMode,
    watcherMode,
  } = useRuntimeSettings()

  return (
    <>
      <SectionCard
        description="Watcher mode is a real desktop runtime setting. It controls whether closing the desktop shell detaches from the runtime or shuts it down."
        title="Runtime lifecycle"
      >
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Current mode</Text>
              <Text style={settingsShellMutedTextStyle}>{shutdownBehaviorText(watcherMode)}</Text>
            </ClearBox>
            <ClearBox
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xs)', flexWrap: 'wrap' }}
            >
              <ClearBox style={settingsShellBadgeStyle}>{watcherModeLabel(watcherMode)}</ClearBox>
              <Button disabled={isLoading || isSaving} onClick={() => void refresh()}>
                {isLoading ? 'Loading…' : 'Refresh'}
              </Button>
            </ClearBox>
          </ClearBox>
        </ClearBox>

        {errorMessage ? (
          <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
        ) : null}

        <RadioGroup
          disabled={isLoading || isSaving || !canPersistWatcherMode}
          label="Desktop watcher mode"
          name="runtime-watcher-mode"
          onChange={(value) => void updateWatcherMode(value === 'persistent' ? 'persistent' : 'ephemeral')}
          options={[
            {
              value: 'ephemeral',
              label: 'Ephemeral runtime',
              description:
                'The desktop window owns the runtime and shuts it down on close after task checks.',
            },
            {
              value: 'persistent',
              label: 'Persistent runtime',
              description: 'The desktop window can close without stopping the runtime process.',
            },
          ]}
          value={watcherMode}
        />

        <Text style={settingsShellMutedTextStyle}>
          {canPersistWatcherMode
            ? 'Changes are written through the desktop runtime settings and affect the close-window behavior immediately.'
            : 'This control is read-only in the split browser dev loop. Open the desktop app to persist watcher mode changes.'}
        </Text>
      </SectionCard>

      <SectionCard
        description="The active shell settings surface reads the same runtime bootstrap metadata that powers the main shell."
        title="Current runtime"
      >
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Transport</Text>
              <Text style={settingsShellMutedTextStyle}>
                {canPersistWatcherMode ? 'Desktop app runtime' : 'Split browser dev loop'}
              </Text>
            </ClearBox>
            <ClearBox style={settingsShellBadgeStyle}>
              {canPersistWatcherMode ? 'Desktop' : 'Browser'}
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Repository root</Text>
              <Text style={settingsShellMutedTextStyle}>
                {runtimeContext?.repoRoot ?? (isLoading ? 'Loading…' : 'Unavailable')}
              </Text>
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Home directory</Text>
              <Text style={settingsShellMutedTextStyle}>
                {runtimeContext?.homeDir || (isLoading ? 'Loading…' : 'Unavailable')}
              </Text>
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Close behavior</Text>
              <Text style={settingsShellMutedTextStyle}>{shutdownBehaviorText(watcherMode)}</Text>
            </ClearBox>
          </ClearBox>
        </ClearBox>
      </SectionCard>
    </>
  )
}
