import type { ISourceOptions } from '@tsparticles/engine'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { Sparkles, X } from 'lucide-react'
import { useUnit } from 'effector-react'
import { loadFull } from 'tsparticles'
import { useEffect, useMemo, useRef, useState } from 'react'

import { $busyWidgetHostIds, clearWidgetBusy } from '../shared/model/widget-busy'
import { Box, Button } from '../shared/ui/primitives'

type WidgetBusyOverlayWidgetProps = {
  hostId: string
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
  background: 'var(--color-overlay-busy)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
  cursor: 'progress',
}

const particlesStyle = {
  position: 'absolute' as const,
  inset: 0,
  pointerEvents: 'none' as const,
}

const centerPlaneStyle = {
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  pointerEvents: 'none' as const,
  animation: 'runa-busy-icon-breathe 1.8s ease-in-out infinite',
}

const releaseButtonStyle = {
  position: 'absolute' as const,
  top: 'var(--space-sm)',
  right: 'var(--space-sm)',
  zIndex: 1,
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

  return Math.max(72, Math.min(Math.sqrt(width * height * BUSY_ICON_AREA_RATIO), Math.min(width, height) * 0.62))
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

export function WidgetBusyOverlayWidget({ hostId }: WidgetBusyOverlayWidgetProps) {
  const [busyWidgetHostIds, onClearWidgetBusy] = useUnit([
    $busyWidgetHostIds,
    clearWidgetBusy,
  ])
  const isBusy = busyWidgetHostIds.includes(hostId)
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

  const particleOptions = useMemo<ISourceOptions>(() => {
    const linkDistance = Math.max(76, Math.round(Math.min(overlaySize.width, overlaySize.height) * 0.22))
    const particleCount = Math.max(
      48,
      Math.min(144, Math.round((overlaySize.width * overlaySize.height) / 7000)),
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
          value: ['#47c0a0', '#91a8a1', '#edf7f4'],
        },
        collisions: {
          enable: true,
          mode: 'bounce',
          maxSpeed: 2.1,
        },
        links: {
          enable: true,
          color: '#7fbeb0',
          distance: linkDistance,
          opacity: 0.2,
          width: 1,
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
            min: 0.16,
            max: 0.6,
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
            min: 1.4,
            max: 3.8,
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
  }, [busyPlaneSize, overlaySize.height, overlaySize.width])

  if (!isBusy) {
    return null
  }

  return (
    <Box
      aria-busy="true"
      aria-label={`Widget ${hostId} is busy`}
      ref={overlayRef}
      style={overlayStyle}
    >
      {isParticlesReady ? (
        <Particles id={`busy-particles-${hostId}`} options={particleOptions} style={particlesStyle} />
      ) : null}
      <Button
        aria-label={`Release busy state for ${hostId}`}
        onClick={() => onClearWidgetBusy(hostId)}
        style={releaseButtonStyle}
      >
        <X size={16} strokeWidth={1.75} />
      </Button>
      <Box
        data-runa-busy-plane=""
        style={{
          ...centerPlaneStyle,
          width: `${busyPlaneSize}px`,
          height: `${busyPlaneSize}px`,
        }}
      >
        <Sparkles
          color="var(--color-text-primary)"
          size={Math.max(28, Math.round(busyPlaneSize * 0.52))}
          style={{ filter: 'drop-shadow(0 0 18px rgba(237, 247, 244, 0.16))' }}
          strokeWidth={1.75}
        />
      </Box>
    </Box>
  )
}
