import runaAvatar from '@assets/img/logo.png'
import { Avatar } from '@/shared/ui/components'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
import {
  buildBusyMarkerAccentDotStyle,
  buildBusyMarkerAvatarStyle,
  buildBusyMarkerGlowStyle,
  buildBusyMarkerLogoShellStyle,
  buildBusyMarkerRingStyle,
  buildBusyMarkerShellStyle,
  busyMarkerRootStyle,
} from '@/widgets/panel/widget-busy-overlay-widget.styles'

type WidgetBusyMarkerProps = {
  size: number
}

export function WidgetBusyMarker({ size }: WidgetBusyMarkerProps) {
  const shellInset = Math.max(8, Math.round(size * 0.08))
  const primaryRingInset = Math.max(10, Math.round(size * 0.13))
  const secondaryRingInset = Math.max(18, Math.round(size * 0.19))
  const logoInset = Math.max(24, Math.round(size * 0.28))
  const glowInset = Math.max(12, Math.round(size * 0.16))
  const dotSize = Math.max(10, Math.round(size * 0.1))
  const avatarSize = Math.max(28, Math.round(size * 0.32))
  const shellRadius = Math.max(16, Math.round(size * 0.18))
  const ringRadius = Math.max(14, Math.round(size * 0.2))

  return (
    <RunaDomScopeProvider component="widget-busy-marker">
      <Box aria-hidden="true" runaComponent="widget-busy-marker-root" style={busyMarkerRootStyle}>
        <Box
          runaComponent="widget-busy-marker-shell"
          style={buildBusyMarkerShellStyle(shellInset, shellRadius)}
        />
        <Box
          runaComponent="widget-busy-marker-primary-ring"
          style={buildBusyMarkerRingStyle(
            primaryRingInset,
            ringRadius,
            '1.5px solid color-mix(in srgb, var(--color-accent-emerald-strong) 70%, transparent)',
            'rotate(8deg)',
            0.92,
          )}
        />
        <Box
          runaComponent="widget-busy-marker-secondary-ring"
          style={buildBusyMarkerRingStyle(
            secondaryRingInset,
            ringRadius + 6,
            '1px solid color-mix(in srgb, var(--color-text-primary) 38%, transparent)',
            'rotate(-16deg)',
            0.82,
          )}
        />
        <Box
          runaComponent="widget-busy-marker-glow"
          style={buildBusyMarkerGlowStyle(glowInset, shellRadius + 6)}
        />
        <Box
          runaComponent="widget-busy-marker-dot-top"
          style={buildBusyMarkerAccentDotStyle(
            dotSize,
            Math.max(8, Math.round(size * 0.12)),
            Math.max(10, Math.round(size * 0.12)),
            'auto',
            'auto',
            'color-mix(in srgb, var(--color-accent-emerald-strong) 70%, transparent)',
          )}
        />
        <Box
          runaComponent="widget-busy-marker-dot-bottom"
          style={buildBusyMarkerAccentDotStyle(
            Math.max(8, Math.round(dotSize * 0.82)),
            'auto',
            'auto',
            Math.max(10, Math.round(size * 0.14)),
            Math.max(10, Math.round(size * 0.16)),
            'color-mix(in srgb, var(--color-text-primary) 52%, transparent)',
          )}
        />
        <Box
          runaComponent="widget-busy-marker-logo-shell"
          style={buildBusyMarkerLogoShellStyle(logoInset, Math.max(14, Math.round(size * 0.16)))}
        >
          <Avatar
            runaComponent="widget-busy-marker-avatar"
            size={avatarSize}
            src={runaAvatar}
            style={buildBusyMarkerAvatarStyle(Math.max(12, Math.round(size * 0.13)))}
          />
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
