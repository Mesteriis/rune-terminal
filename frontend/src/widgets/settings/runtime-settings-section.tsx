import { useEffect, useState, type ReactNode } from 'react'

import { RadioGroup, ClearBox } from '@/shared/ui/components'
import { Button, Input, Text } from '@/shared/ui/primitives'
import { useRuntimeSettings } from '@/features/runtime/model/use-runtime-settings'
import { useWindowTitleSettings } from '@/features/runtime/model/use-window-title-settings'
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
  const {
    autoTitle,
    customTitle,
    errorMessage: windowTitleError,
    isLoading: isLoadingWindowTitle,
    isSaving: isSavingWindowTitle,
    mode: windowTitleMode,
    refresh: refreshWindowTitle,
    updateSettings: updateWindowTitleSettings,
  } = useWindowTitleSettings()
  const [customTitleDraft, setCustomTitleDraft] = useState('')

  useEffect(() => {
    setCustomTitleDraft(customTitle)
  }, [customTitle])

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
        description="Window title rules stay narrow on purpose: auto title follows the active workspace on the current shell path, or operators can pin an explicit custom title."
        title="Window title"
      >
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>Current rule</Text>
              <Text style={settingsShellMutedTextStyle}>
                {windowTitleMode === 'custom'
                  ? 'Pinned custom title stays until reset back to auto.'
                  : 'Auto title follows the active workspace title on the current shell path.'}
              </Text>
            </ClearBox>
            <ClearBox
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xs)', flexWrap: 'wrap' }}
            >
              <ClearBox style={settingsShellBadgeStyle}>{windowTitleMode}</ClearBox>
              <Button
                disabled={isLoadingWindowTitle || isSavingWindowTitle}
                onClick={() => void refreshWindowTitle()}
              >
                {isLoadingWindowTitle ? 'Loading…' : 'Refresh'}
              </Button>
            </ClearBox>
          </ClearBox>
        </ClearBox>

        {windowTitleError ? (
          <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{windowTitleError}</Text>
        ) : null}

        <RadioGroup
          disabled={isLoadingWindowTitle || isSavingWindowTitle}
          label="Window title mode"
          name="window-title-mode"
          onChange={(value) =>
            void updateWindowTitleSettings({
              mode: value === 'custom' ? 'custom' : 'auto',
            })
          }
          options={[
            {
              value: 'auto',
              label: 'Auto title',
              description: 'Use the active workspace title and append the product label.',
            },
            {
              value: 'custom',
              label: 'Custom title',
              description: 'Pin an explicit operator-defined window title until reset.',
            },
          ]}
          value={windowTitleMode}
        />

        <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)' }}>
          <Input
            aria-label="Custom window title"
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode !== 'custom'}
            onChange={(event) => setCustomTitleDraft(event.currentTarget.value)}
            placeholder="Ops Shell"
            value={customTitleDraft}
          />
          <Text style={settingsShellMutedTextStyle}>Auto preview: {autoTitle || 'RunaTerminal'}</Text>
          <Button
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode !== 'custom'}
            onClick={() =>
              void updateWindowTitleSettings({
                customTitle: customTitleDraft,
                mode: 'custom',
              })
            }
          >
            Save custom title
          </Button>
          <Button
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode === 'auto'}
            onClick={() =>
              void updateWindowTitleSettings({
                mode: 'auto',
              })
            }
          >
            Reset to auto
          </Button>
        </ClearBox>
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
