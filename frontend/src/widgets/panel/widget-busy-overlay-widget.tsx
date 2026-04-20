import type { ISourceOptions } from '@tsparticles/engine'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { useUnit } from 'effector-react'
import { loadFull } from 'tsparticles'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import { $aiBlockedWidgetHostIds } from '@/shared/model/ai-blocked-widgets'
import { Box } from '@/shared/ui/primitives'
import { WidgetBusyMarker } from '@/widgets/panel/widget-busy-marker'

type WidgetBusyOverlayWidgetProps = {
  hostId: string
  mountNode?: HTMLElement | null
}

const BUSY_ICON_AREA_RATIO = 0.2
let particlesEngineReady = false
let particlesEnginePromise: Promise<void> | null = null

const overlayStyle = {
  position: 'absolute' as const,
  inset: 0,
  zIndex: 'var(--z-widget-busy)',
  overflow: 'hidden' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  cursor: 'progress',
}

const particlesStyle = {
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  opacity: 1,
}

const blurLayerStyle = {
  position: 'absolute' as const,
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none' as const,
  background: 'rgba(5, 14, 12, 0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

const particlesLayerStyle = {
  boxSizing: 'border-box' as const,
  position: 'absolute' as const,
  inset: 0,
  padding: 0,
  background: 'transparent',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  pointerEvents: 'none' as const,
  zIndex: 1,
  width: '100%',
  height: '100%',
  overflow: 'hidden' as const,
  mixBlendMode: 'screen' as const,
}

const foregroundLayerStyle = {
  boxSizing: 'border-box' as const,
  position: 'absolute' as const,
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
  pointerEvents: 'none' as const,
  zIndex: 2,
}

const centerPlaneStyle = {
  boxSizing: 'border-box' as const,
  position: 'relative' as const,
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

function getOverlaySize(element: HTMLDivElement | null) {
  if (!element) {
    return { height: 0, width: 0 }
  }

  return {
    width: element.clientWidth,
    height: element.clientHeight,
  }
}

function getBusyPlaneSize(width: number, height: number) {
  if (width === 0 || height === 0) {
    return 0
  }

  return Math.max(
    72,
    Math.min(Math.sqrt(width * height * BUSY_ICON_AREA_RATIO), Math.min(width, height) * 0.62),
  )
}

function ensureParticlesEngine() {
  if (particlesEngineReady) {
    return Promise.resolve()
  }

  if (!particlesEnginePromise) {
    particlesEnginePromise = initParticlesEngine(async (engine) => {
      await loadFull(engine)
      particlesEngineReady = true
    })
  }

  return particlesEnginePromise
}

export function WidgetBusyOverlayWidget({ hostId, mountNode }: WidgetBusyOverlayWidgetProps) {
  const blockedWidgetHostIds = useUnit($aiBlockedWidgetHostIds)
  const isBusy = blockedWidgetHostIds.includes(hostId)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [isParticlesReady, setIsParticlesReady] = useState(particlesEngineReady)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    ensureParticlesEngine().then(() => {
      setIsParticlesReady(true)
    })
  }, [])

  useEffect(() => {
    if (!isBusy) {
      return
    }

    const nextSize = getOverlaySize(overlayRef.current)

    setOverlaySize(nextSize)

    if (typeof ResizeObserver === 'undefined' || !overlayRef.current) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      setOverlaySize(getOverlaySize(overlayRef.current))
    })

    resizeObserver.observe(overlayRef.current)

    return () => resizeObserver.disconnect()
  }, [isBusy])

  const busyPlaneSize = useMemo(
    () => getBusyPlaneSize(overlaySize.width, overlaySize.height),
    [overlaySize.height, overlaySize.width],
  )
  const particlesMountKey = useMemo(
    () => `${hostId}-${overlaySize.width}x${overlaySize.height}`,
    [hostId, overlaySize.height, overlaySize.width],
  )

  const particleOptions = useMemo<ISourceOptions>(() => {
    const linkDistance = Math.max(76, Math.round(Math.min(overlaySize.width, overlaySize.height) * 0.22))
    const particleCount = Math.max(
      72,
      Math.min(196, Math.round((overlaySize.width * overlaySize.height) / 5600)),
    )

    return {
      autoPlay: true,
      background: {
        color: {
          value: 'transparent',
        },
      },
      detectRetina: true,
      fpsLimit: 60,
      fullScreen: {
        enable: false,
        zIndex: 0,
      },
      interactivity: {
        events: {
          onClick: {
            enable: false,
            mode: [],
          },
          onHover: {
            enable: false,
            mode: [],
          },
          resize: {
            enable: true,
            delay: 0,
          },
        },
      },
      particles: {
        color: {
          value: ['#78e6ca', '#b6dfd4', '#fbfffd'],
        },
        collisions: {
          enable: true,
          mode: 'bounce',
          maxSpeed: 2.1,
        },
        links: {
          enable: true,
          color: '#b8efe2',
          distance: linkDistance,
          opacity: 0.52,
          width: 1.5,
        },
        move: {
          direction: 'none',
          enable: true,
          noise: {
            enable: true,
            delay: {
              value: {
                min: 0.6,
                max: 1.4,
              },
            },
          },
          outModes: {
            default: 'bounce',
          },
          random: true,
          speed: {
            min: 0.27,
            max: 1.08,
          },
          straight: false,
          trail: {
            enable: false,
            length: 3,
            fill: {
              color: {
                value: '#06110f',
              },
            },
          },
          vibrate: false,
        },
        number: {
          value: particleCount,
          density: {
            enable: false,
          },
        },
        opacity: {
          value: {
            min: 0.42,
            max: 0.96,
          },
          animation: {
            enable: true,
            speed: 0.8,
            startValue: 'random',
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: {
            min: 1.8,
            max: 4.2,
          },
          animation: {
            enable: true,
            speed: 0.9,
            startValue: 'random',
            sync: false,
          },
        },
      },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
    }
  }, [overlaySize.height, overlaySize.width])

  if (!isBusy) {
    return null
  }

  const overlay = (
    <Box
      aria-busy="true"
      aria-label={`Widget ${hostId} is busy`}
      runaComponent="widget-busy-overlay-root"
      ref={overlayRef}
      style={overlayStyle}
    >
      <Box data-runa-busy-blur-layer="" runaComponent="widget-busy-blur-layer" style={blurLayerStyle} />
      <Box
        data-runa-busy-particles-layer=""
        runaComponent="widget-busy-particles-layer"
        style={particlesLayerStyle}
      >
        {isParticlesReady && overlaySize.width > 0 && overlaySize.height > 0 ? (
          <Particles
            id={`busy-particles-${hostId}`}
            key={particlesMountKey}
            options={particleOptions}
            style={particlesStyle}
          />
        ) : null}
      </Box>
      <Box data-runa-busy-foreground="" runaComponent="widget-busy-foreground" style={foregroundLayerStyle}>
        <Box
          data-runa-busy-plane=""
          runaComponent="widget-busy-plane"
          style={{
            ...centerPlaneStyle,
            width: `${busyPlaneSize}px`,
            height: `${busyPlaneSize}px`,
          }}
        >
          <WidgetBusyMarker size={busyPlaneSize} />
        </Box>
      </Box>
    </Box>
  )

  return mountNode ? createPortal(overlay, mountNode) : overlay
}
