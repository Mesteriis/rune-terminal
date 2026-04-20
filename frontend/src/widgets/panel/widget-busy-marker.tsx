import runaAvatar from '@assets/img/logo.png'
import { Avatar } from '@/shared/ui/components'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'

type WidgetBusyMarkerProps = {
  size: number
}

const markerRootStyle = {
  position: 'relative' as const,
  width: '100%',
  height: '100%',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  overflow: 'visible' as const,
}

function buildRingStyle(inset: number, radius: number, border: string, transform: string, opacity: number) {
  return {
    position: 'absolute' as const,
    inset,
    padding: 0,
    border,
    borderRadius: radius,
    background: 'transparent',
    boxShadow: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    opacity,
    transform,
  }
}

function buildAccentDotStyle(
  size: number,
  top: number | 'auto',
  right: number | 'auto',
  bottom: number | 'auto',
  left: number | 'auto',
  glowColor: string,
) {
  return {
    position: 'absolute' as const,
    top,
    right,
    bottom,
    left,
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    padding: 0,
    border: 'none',
    borderRadius: size,
    background: `radial-gradient(circle at 32% 32%, var(--color-text-primary) 0%, ${glowColor} 55%, rgba(5, 14, 12, 0) 100%)`,
    boxShadow: `0 0 ${Math.max(10, Math.round(size * 1.8))}px ${glowColor}`,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  }
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
      <Box aria-hidden="true" runaComponent="widget-busy-marker-root" style={markerRootStyle}>
        <Box
          runaComponent="widget-busy-marker-shell"
          style={{
            position: 'absolute',
            inset: shellInset,
            padding: 0,
            border: '1px solid rgba(159, 223, 208, 0.4)',
            borderRadius: shellRadius,
            background: `linear-gradient(145deg, rgba(5, 14, 12, 0.24), rgba(8, 24, 20, 0.08)), radial-gradient(circle at 30% 28%, rgba(120, 230, 202, 0.24), rgba(5, 14, 12, 0) 62%)`,
            boxShadow: '0 0 28px rgba(37, 120, 101, 0.16), inset 0 0 18px rgba(120, 230, 202, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        />
        <Box
          runaComponent="widget-busy-marker-primary-ring"
          style={buildRingStyle(
            primaryRingInset,
            ringRadius,
            '1.5px solid rgba(120, 230, 202, 0.7)',
            'rotate(8deg)',
            0.92,
          )}
        />
        <Box
          runaComponent="widget-busy-marker-secondary-ring"
          style={buildRingStyle(
            secondaryRingInset,
            ringRadius + 6,
            '1px solid rgba(182, 223, 212, 0.38)',
            'rotate(-16deg)',
            0.82,
          )}
        />
        <Box
          runaComponent="widget-busy-marker-glow"
          style={{
            position: 'absolute',
            inset: glowInset,
            padding: 0,
            border: 'none',
            borderRadius: shellRadius + 6,
            background:
              'radial-gradient(circle at 50% 50%, rgba(120, 230, 202, 0.16), rgba(5, 14, 12, 0) 72%)',
            boxShadow: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            opacity: 0.9,
          }}
        />
        <Box
          runaComponent="widget-busy-marker-dot-top"
          style={buildAccentDotStyle(
            dotSize,
            Math.max(8, Math.round(size * 0.12)),
            Math.max(10, Math.round(size * 0.12)),
            'auto',
            'auto',
            'rgba(120, 230, 202, 0.7)',
          )}
        />
        <Box
          runaComponent="widget-busy-marker-dot-bottom"
          style={buildAccentDotStyle(
            Math.max(8, Math.round(dotSize * 0.82)),
            'auto',
            'auto',
            Math.max(10, Math.round(size * 0.14)),
            Math.max(10, Math.round(size * 0.16)),
            'rgba(182, 223, 212, 0.52)',
          )}
        />
        <Box
          runaComponent="widget-busy-marker-logo-shell"
          style={{
            position: 'absolute',
            inset: logoInset,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: '1px solid rgba(184, 239, 226, 0.32)',
            borderRadius: Math.max(14, Math.round(size * 0.16)),
            background: 'linear-gradient(145deg, rgba(5, 14, 12, 0.56), rgba(12, 34, 29, 0.16))',
            boxShadow: '0 0 20px rgba(37, 120, 101, 0.18), inset 0 0 16px rgba(182, 223, 212, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Avatar
            runaComponent="widget-busy-marker-avatar"
            size={avatarSize}
            src={runaAvatar}
            style={{
              borderRadius: Math.max(12, Math.round(size * 0.13)),
              boxShadow: '0 0 18px rgba(120, 230, 202, 0.18)',
            }}
          />
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
