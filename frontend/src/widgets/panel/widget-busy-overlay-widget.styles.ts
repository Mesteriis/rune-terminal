import type * as React from 'react'

export const busyOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 'var(--z-widget-busy)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  cursor: 'progress',
}

export const busyParticlesStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  opacity: 1,
}

export const busyBlurLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  background: 'var(--color-overlay-busy)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

export const busyParticlesLayerStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'absolute',
  inset: 0,
  padding: 0,
  background: 'transparent',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  pointerEvents: 'none',
  zIndex: 1,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  mixBlendMode: 'screen',
}

export const busyForegroundLayerStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'absolute',
  inset: 0,
  padding: 0,
  background: 'transparent',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 2,
}

export const busyCenterPlaneStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  animation: 'runa-busy-icon-breathe 2.2s ease-in-out infinite',
}

export const busyMarkerRootStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  overflow: 'visible',
}

export function buildBusyMarkerRingStyle(
  inset: number,
  radius: number,
  border: string,
  transform: string,
  opacity: number,
): React.CSSProperties {
  return {
    position: 'absolute',
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

export function buildBusyMarkerAccentDotStyle(
  size: number,
  top: number | 'auto',
  right: number | 'auto',
  bottom: number | 'auto',
  left: number | 'auto',
  glowColor: string,
): React.CSSProperties {
  return {
    position: 'absolute',
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
    background: `radial-gradient(circle at 32% 32%, var(--color-text-primary) 0%, ${glowColor} 55%, transparent 100%)`,
    boxShadow: `0 0 ${Math.max(10, Math.round(size * 1.8))}px ${glowColor}`,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  }
}

export function buildBusyMarkerShellStyle(inset: number, radius: number): React.CSSProperties {
  return {
    position: 'absolute',
    inset,
    padding: 0,
    border: '1px solid color-mix(in srgb, var(--color-accent-emerald-strong) 40%, transparent)',
    borderRadius: radius,
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--color-canvas) 24%, transparent), color-mix(in srgb, var(--color-canvas-elevated) 8%, transparent)), radial-gradient(circle at 30% 28%, color-mix(in srgb, var(--color-accent-emerald-strong) 24%, transparent), transparent 62%)',
    boxShadow:
      '0 0 28px color-mix(in srgb, var(--color-accent-emerald) 16%, transparent), inset 0 0 18px color-mix(in srgb, var(--color-accent-emerald-strong) 8%, transparent)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }
}

export function buildBusyMarkerGlowStyle(inset: number, radius: number): React.CSSProperties {
  return {
    position: 'absolute',
    inset,
    padding: 0,
    border: 'none',
    borderRadius: radius,
    background:
      'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-accent-emerald-strong) 16%, transparent), transparent 72%)',
    boxShadow: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    opacity: 0.9,
  }
}

export function buildBusyMarkerLogoShellStyle(inset: number, radius: number): React.CSSProperties {
  return {
    position: 'absolute',
    inset,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: '1px solid color-mix(in srgb, var(--color-text-primary) 32%, transparent)',
    borderRadius: radius,
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--color-canvas) 56%, transparent), color-mix(in srgb, var(--color-canvas-elevated) 16%, transparent))',
    boxShadow:
      '0 0 20px color-mix(in srgb, var(--color-accent-emerald) 18%, transparent), inset 0 0 16px color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }
}

export function buildBusyMarkerAvatarStyle(radius: number): React.CSSProperties {
  return {
    borderRadius: radius,
    boxShadow: '0 0 18px color-mix(in srgb, var(--color-accent-emerald-strong) 18%, transparent)',
  }
}

function readRootCssVariable(name: string) {
  if (typeof window === 'undefined') {
    return `var(${name})`
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || `var(${name})`
}

export function resolveBusyParticlePalette() {
  return {
    colors: [
      readRootCssVariable('--runa-busy-particle-primary'),
      readRootCssVariable('--runa-busy-particle-secondary'),
      readRootCssVariable('--runa-busy-particle-tertiary'),
    ],
    linkColor: readRootCssVariable('--runa-busy-particle-link'),
    trailColor: readRootCssVariable('--runa-busy-particle-trail'),
  }
}
