import { Box, Surface, Text } from '../shared/ui/primitives'
import { ModalHostWidget } from './modal-host-widget'
import { PanelModalActionsWidget } from './panel-modal-actions-widget'
import { WidgetBusyOverlayWidget } from './widget-busy-overlay-widget'

export type AiPanelWidgetProps = {
  hostId: string
}

const panelContentStyle = {
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: 'var(--padding-widget)',
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const sectionStyle = {
  padding: 'var(--space-md)',
  background: 'var(--color-canvas-elevated)',
}

const bodySectionStyle = {
  ...sectionStyle,
  flex: 1,
  minHeight: 0,
}

const titleClusterStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const eyebrowStyle = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}

const headingStyle = {
  color: 'var(--color-text-primary)',
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 600,
}

const bodyCopyStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-md)',
  lineHeight: '24px',
}

export function AiPanelWidget({ hostId }: AiPanelWidgetProps) {
  return (
    <Box data-runa-modal-anchor={hostId} style={panelContentStyle}>
      <Surface style={sectionStyle}>
        <Box style={titleClusterStyle}>
          <Text style={eyebrowStyle}>AI</Text>
          <Text style={headingStyle}>Assistant panel</Text>
        </Box>
      </Surface>
      <Surface style={bodySectionStyle}>
        <Text style={bodyCopyStyle}>
          Assistant surface is mounted as a shell-managed side panel instead of a Dockview group. This keeps resize local to the shell while preserving widget-level chrome and panel content structure.
        </Text>
      </Surface>
      <Surface style={sectionStyle}>
        <PanelModalActionsWidget hostId={hostId} panelTitle="AI" />
      </Surface>
      <ModalHostWidget hostId={hostId} scope="widget" />
      <WidgetBusyOverlayWidget hostId={hostId} />
    </Box>
  )
}
