import type { ISourceOptions } from '@tsparticles/engine'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { useUnit } from 'effector-react'
import { loadFull } from 'tsparticles'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

import { $aiBlockedWidgetHostIds } from '@/shared/model/ai-blocked-widgets'
import { useRunaDomIdentity } from '@/shared/ui/dom-id'

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

const busyGraphicStyle = {
  width: '100%',
  height: '100%',
  display: 'block',
  overflow: 'visible',
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

function getBusyOverlayMountNode(hostId: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const anchor = document.querySelector(`[data-runa-modal-anchor="${hostId}"]`)

  return anchor?.closest('.dv-groupview') as HTMLElement | null
}

export function WidgetBusyOverlayWidget({ hostId }: WidgetBusyOverlayWidgetProps) {
  const blockedWidgetHostIds = useUnit($aiBlockedWidgetHostIds)
  const isBusy = blockedWidgetHostIds.includes(hostId)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const overlayIdentity = useRunaDomIdentity(`widget-busy-overlay-${hostId}`)
  const blurLayerIdentity = useRunaDomIdentity(`widget-busy-blur-layer-${hostId}`)
  const particlesLayerIdentity = useRunaDomIdentity(`widget-busy-particles-layer-${hostId}`)
  const foregroundLayerIdentity = useRunaDomIdentity(`widget-busy-foreground-${hostId}`)
  const planeIdentity = useRunaDomIdentity(`widget-busy-plane-${hostId}`)
  const graphicIdentity = useRunaDomIdentity(`widget-busy-graphic-${hostId}`)
  const graphicBlurIdentity = useRunaDomIdentity(`widget-busy-graphic-blur-${hostId}`)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)
  const [isParticlesReady, setIsParticlesReady] = useState(particlesEngineReady)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    ensureParticlesEngine().then(() => {
      setIsParticlesReady(true)
    })
  }, [])

  useEffect(() => {
    const resolveMountNode = () => {
      setMountNode(getBusyOverlayMountNode(hostId))
    }

    resolveMountNode()

    if (typeof window === 'undefined') {
      return
    }

    const frameId = window.requestAnimationFrame(resolveMountNode)

    return () => window.cancelAnimationFrame(frameId)
  }, [hostId])

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

  useEffect(() => {
    if (!isBusy || overlaySize.width === 0 || overlaySize.height === 0 || typeof document === 'undefined') {
      return
    }

    const particlesElement = document.getElementById(`busy-particles-${hostId}`)

    if (!(particlesElement instanceof HTMLDivElement)) {
      return
    }

    particlesElement.style.position = 'absolute'
    particlesElement.style.inset = '0'
    particlesElement.style.width = '100%'
    particlesElement.style.height = '100%'
    particlesElement.style.display = 'block'
  }, [hostId, isBusy, overlaySize.height, overlaySize.width])

  const busyPlaneSize = useMemo(
    () => getBusyPlaneSize(overlaySize.width, overlaySize.height),
    [overlaySize.height, overlaySize.width],
  )
  const particlesMountKey = useMemo(
    () => `${hostId}-${overlaySize.width}x${overlaySize.height}`,
    [hostId, overlaySize.height, overlaySize.width],
  )
  const gradientId = useMemo(() => `busy-gradient-${hostId}`, [hostId])
  const borderGradientId = useMemo(() => `busy-border-gradient-${hostId}`, [hostId])
  const accentGradientId = useMemo(() => `busy-accent-gradient-${hostId}`, [hostId])

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
  }, [busyPlaneSize, overlaySize.height, overlaySize.width])

  if (!isBusy) {
    return null
  }

  const overlay = (
    <div
      aria-busy="true"
      aria-label={`Widget ${hostId} is busy`}
      data-runa-component={overlayIdentity.scope.component}
      data-runa-layout={overlayIdentity.scope.layout}
      data-runa-node={overlayIdentity.node}
      data-runa-widget={overlayIdentity.scope.widget}
      id={overlayIdentity.id}
      ref={overlayRef}
      style={overlayStyle}
    >
      <div
        data-runa-busy-blur-layer=""
        data-runa-component={blurLayerIdentity.scope.component}
        data-runa-layout={blurLayerIdentity.scope.layout}
        data-runa-node={blurLayerIdentity.node}
        data-runa-widget={blurLayerIdentity.scope.widget}
        id={blurLayerIdentity.id}
        style={blurLayerStyle}
      />
      <div
        data-runa-busy-particles-layer=""
        data-runa-component={particlesLayerIdentity.scope.component}
        data-runa-layout={particlesLayerIdentity.scope.layout}
        data-runa-node={particlesLayerIdentity.node}
        data-runa-widget={particlesLayerIdentity.scope.widget}
        id={particlesLayerIdentity.id}
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
      </div>
      <div
        data-runa-busy-foreground=""
        data-runa-component={foregroundLayerIdentity.scope.component}
        data-runa-layout={foregroundLayerIdentity.scope.layout}
        data-runa-node={foregroundLayerIdentity.node}
        data-runa-widget={foregroundLayerIdentity.scope.widget}
        id={foregroundLayerIdentity.id}
        style={foregroundLayerStyle}
      >
        <div
          data-runa-busy-plane=""
          data-runa-component={planeIdentity.scope.component}
          data-runa-layout={planeIdentity.scope.layout}
          data-runa-node={planeIdentity.node}
          data-runa-widget={planeIdentity.scope.widget}
          id={planeIdentity.id}
          style={{
            ...centerPlaneStyle,
            width: `${busyPlaneSize}px`,
            height: `${busyPlaneSize}px`,
          }}
        >
          <svg
            aria-hidden="true"
            data-runa-component={graphicIdentity.scope.component}
            data-runa-layout={graphicIdentity.scope.layout}
            data-runa-node={graphicIdentity.node}
            data-runa-widget={graphicIdentity.scope.widget}
            id={graphicIdentity.id}
            style={busyGraphicStyle}
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id={gradientId} x1="8%" x2="92%" y1="14%" y2="86%">
                <stop offset="0%" stopColor="var(--color-accent-cold-tea)">
                  <animate
                    attributeName="stop-color"
                    dur="4.8s"
                    repeatCount="indefinite"
                    values="var(--color-accent-cold-tea); var(--color-accent-emerald-strong); var(--color-accent-cold-tea)"
                  />
                </stop>
                <stop offset="52%" stopColor="var(--color-accent-emerald-strong)">
                  <animate
                    attributeName="stop-color"
                    dur="4.8s"
                    repeatCount="indefinite"
                    values="var(--color-accent-emerald-strong); var(--color-text-primary); var(--color-accent-emerald-strong)"
                  />
                </stop>
                <stop offset="100%" stopColor="var(--color-accent-cold-tea)">
                  <animate
                    attributeName="stop-color"
                    dur="4.8s"
                    repeatCount="indefinite"
                    values="var(--color-accent-cold-tea); var(--color-accent-emerald); var(--color-accent-cold-tea)"
                  />
                </stop>
                <animateTransform
                  attributeName="gradientTransform"
                  dur="6s"
                  repeatCount="indefinite"
                  type="rotate"
                  values="0 0.5 0.5; 360 0.5 0.5"
                />
              </linearGradient>
              <linearGradient id={borderGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-cold-tea)" stopOpacity="0.72" />
                <stop offset="50%" stopColor="var(--color-accent-emerald-strong)" stopOpacity="0.94" />
                <stop offset="100%" stopColor="var(--color-accent-cold-tea)" stopOpacity="0.72" />
                <animateTransform
                  attributeName="gradientTransform"
                  dur="5.4s"
                  repeatCount="indefinite"
                  type="rotate"
                  values="0 0.5 0.5; -360 0.5 0.5"
                />
              </linearGradient>
              <linearGradient id={accentGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-cold-tea)" />
                <stop offset="48%" stopColor="var(--color-accent-emerald-strong)" />
                <stop offset="100%" stopColor="var(--color-text-primary)" />
                <animateTransform
                  attributeName="gradientTransform"
                  dur="6.6s"
                  repeatCount="indefinite"
                  type="rotate"
                  values="0 0.5 0.5; 360 0.5 0.5"
                />
              </linearGradient>
            </defs>

            <foreignObject height="84" width="84" x="8" y="8">
              <div
                data-runa-component={graphicBlurIdentity.scope.component}
                data-runa-layout={graphicBlurIdentity.scope.layout}
                data-runa-node={graphicBlurIdentity.node}
                data-runa-widget={graphicBlurIdentity.scope.widget}
                id={graphicBlurIdentity.id}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '18px',
                  background: 'rgba(5, 14, 12, 0.04)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              />
            </foreignObject>
            <rect
              fill="transparent"
              height="84"
              rx="18"
              ry="18"
              stroke={`url(#${borderGradientId})`}
              strokeWidth="1.4"
              width="84"
              x="8"
              y="8"
            />
            <g transform="translate(28.4 28.4)">
              <path
                d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                transform="scale(1.8)"
              />
            </g>
            <g transform="translate(63 16)">
              <path
                d="M6.917 1.614a.58.58 0 0 1 1.166 0l.624 3.301a1.19 1.19 0 0 0 .948.948l3.301.624a.58.58 0 0 1 0 1.166l-3.301.624a1.19 1.19 0 0 0-.948.948l-.624 3.301a.58.58 0 0 1-1.166 0l-.624-3.301a1.19 1.19 0 0 0-.948-.948l-3.301-.624a.58.58 0 0 1 0-1.166l3.301-.624a1.19 1.19 0 0 0 .948-.948z"
                fill="none"
                stroke={`url(#${accentGradientId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="0.95"
              />
            </g>
            <circle
              cx="30.5"
              cy="69.5"
              fill="none"
              r="5.6"
              stroke={`url(#${accentGradientId})`}
              strokeWidth="2.8"
            />
          </svg>
        </div>
      </div>
    </div>
  )

  return mountNode ? createPortal(overlay, mountNode) : overlay
}
