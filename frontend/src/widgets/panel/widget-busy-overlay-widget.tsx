import type { ISourceOptions } from '@tsparticles/engine'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { useUnit } from 'effector-react'
import { loadFull } from 'tsparticles'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import { $aiBlockedWidgetHostIds } from '@/shared/model/ai-blocked-widgets'
import { Box } from '@/shared/ui/primitives'
import { WidgetBusyMarker } from '@/widgets/panel/widget-busy-marker'
import {
  busyBlurLayerStyle,
  busyCenterPlaneStyle,
  busyForegroundLayerStyle,
  busyOverlayStyle,
  busyParticlesLayerStyle,
  busyParticlesStyle,
  resolveBusyParticlePalette,
} from '@/widgets/panel/widget-busy-overlay-widget.styles'

type WidgetBusyOverlayWidgetProps = {
  hostId: string
  mountNode?: HTMLElement | null
}

const BUSY_ICON_AREA_RATIO = 0.2
let particlesEngineReady = false
let particlesEnginePromise: Promise<void> | null = null

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

function getRootThemeSignal() {
  if (typeof document === 'undefined') {
    return ''
  }

  const root = document.documentElement

  return `${root.getAttribute('data-runa-theme') ?? ''}:${root.getAttribute('data-runa-resolved-theme') ?? ''}`
}

export function WidgetBusyOverlayWidget({ hostId, mountNode }: WidgetBusyOverlayWidgetProps) {
  const blockedWidgetHostIds = useUnit($aiBlockedWidgetHostIds)
  const isBusy = blockedWidgetHostIds.includes(hostId)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [isParticlesReady, setIsParticlesReady] = useState(particlesEngineReady)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })
  const [rootThemeSignal, setRootThemeSignal] = useState(getRootThemeSignal)

  useEffect(() => {
    ensureParticlesEngine().then(() => {
      setIsParticlesReady(true)
    })
  }, [])

  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setRootThemeSignal(getRootThemeSignal())
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-runa-theme', 'data-runa-resolved-theme'],
    })

    return () => observer.disconnect()
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
    () => `${hostId}-${overlaySize.width}x${overlaySize.height}-${rootThemeSignal}`,
    [hostId, overlaySize.height, overlaySize.width, rootThemeSignal],
  )

  const particleOptions = useMemo<ISourceOptions>(() => {
    const linkDistance = Math.max(76, Math.round(Math.min(overlaySize.width, overlaySize.height) * 0.22))
    const particleCount = Math.max(
      72,
      Math.min(196, Math.round((overlaySize.width * overlaySize.height) / 5600)),
    )
    const particlePalette = resolveBusyParticlePalette()

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
          value: particlePalette.colors,
        },
        collisions: {
          enable: true,
          mode: 'bounce',
          maxSpeed: 2.1,
        },
        links: {
          enable: true,
          color: particlePalette.linkColor,
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
                value: particlePalette.trailColor,
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
  }, [overlaySize.height, overlaySize.width, rootThemeSignal])

  if (!isBusy) {
    return null
  }

  const overlay = (
    <Box
      aria-busy="true"
      aria-label={`Widget ${hostId} is busy`}
      runaComponent="widget-busy-overlay-root"
      ref={overlayRef}
      style={busyOverlayStyle}
    >
      <Box data-runa-busy-blur-layer="" runaComponent="widget-busy-blur-layer" style={busyBlurLayerStyle} />
      <Box
        data-runa-busy-particles-layer=""
        runaComponent="widget-busy-particles-layer"
        style={busyParticlesLayerStyle}
      >
        {isParticlesReady && overlaySize.width > 0 && overlaySize.height > 0 ? (
          <Particles
            id={`busy-particles-${hostId}`}
            key={particlesMountKey}
            options={particleOptions}
            style={busyParticlesStyle}
          />
        ) : null}
      </Box>
      <Box
        data-runa-busy-foreground=""
        runaComponent="widget-busy-foreground"
        style={busyForegroundLayerStyle}
      >
        <Box
          data-runa-busy-plane=""
          runaComponent="widget-busy-plane"
          style={{
            ...busyCenterPlaneStyle,
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
