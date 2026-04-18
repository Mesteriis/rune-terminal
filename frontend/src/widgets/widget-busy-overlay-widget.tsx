import { Sparkles, X } from 'lucide-react'
import { useUnit } from 'effector-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { $busyWidgetHostIds, clearWidgetBusy } from '../shared/model/widget-busy'
import { Box, Button, Canvas } from '../shared/ui/primitives'

type WidgetBusyOverlayWidgetProps = {
  hostId: string
}

type Particle = {
  age: number
  emitter: 'bottom-left' | 'top-right'
  life: number
  previousX: number
  previousY: number
  size: number
  x: number
  y: number
  vx: number
  vy: number
}

const BUSY_ICON_AREA_RATIO = 0.2
const PARTICLE_LIMIT = 88
const EMITTER_MARGIN = 18

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

const canvasStyle = {
  position: 'absolute' as const,
  inset: 0,
  pointerEvents: 'none' as const,
}

const centerPlaneStyle = {
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-glass-strong)',
  boxShadow: 'var(--shadow-glass-control)',
  backdropFilter: 'var(--blur-glass-sm)',
  WebkitBackdropFilter: 'var(--blur-glass-sm)',
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

function createParticle(
  width: number,
  height: number,
  emitter: Particle['emitter'],
): Particle {
  const margin = EMITTER_MARGIN
  const fromBottomLeft = emitter === 'bottom-left'
  const x = fromBottomLeft
    ? margin + Math.random() * width * 0.08
    : width - margin - Math.random() * width * 0.08
  const y = fromBottomLeft
    ? height - margin - Math.random() * height * 0.12
    : margin + Math.random() * height * 0.12

  return {
    emitter,
    x,
    y,
    previousX: x,
    previousY: y,
    vx: fromBottomLeft ? 1.35 + Math.random() * 0.8 : -1.35 - Math.random() * 0.8,
    vy: fromBottomLeft ? -1.45 - Math.random() * 0.9 : 1.45 + Math.random() * 0.9,
    size: 1.25 + Math.random() * 2.2,
    age: 0,
    life: 54 + Math.random() * 42,
  }
}

export function WidgetBusyOverlayWidget({ hostId }: WidgetBusyOverlayWidgetProps) {
  const [busyWidgetHostIds, onClearWidgetBusy] = useUnit([
    $busyWidgetHostIds,
    clearWidgetBusy,
  ])
  const isBusy = busyWidgetHostIds.includes(hostId)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 })

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

  useEffect(() => {
    if (!isBusy || !canvasRef.current || overlaySize.width === 0 || overlaySize.height === 0) {
      return
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    const width = overlaySize.width
    const height = overlaySize.height
    const particles: Particle[] = []
    const centerX = width / 2
    const centerY = height / 2
    const obstacleHalfSize = busyPlaneSize * 0.38

    canvas.width = Math.round(width * devicePixelRatio)
    canvas.height = Math.round(height * devicePixelRatio)
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

    let frameHandle = 0

    const spawnParticles = () => {
      if (particles.length >= PARTICLE_LIMIT) {
        return
      }

      particles.push(createParticle(width, height, 'bottom-left'))
      particles.push(createParticle(width, height, 'top-right'))
    }

    const drawFrame = (timestamp: number) => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'

      if (particles.length < PARTICLE_LIMIT && timestamp % 2 < 1) {
        spawnParticles()
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        const dx = centerX - particle.x
        const dy = centerY - particle.y
        const distance = Math.max(Math.hypot(dx, dy), 1)
        const directionX = dx / distance
        const directionY = dy / distance
        const swirlStrength = particle.emitter === 'bottom-left' ? -0.13 : 0.13
        const flowStrength = 0.065 + Math.min(0.16, 140 / distance / 100)

        particle.previousX = particle.x
        particle.previousY = particle.y

        particle.vx += directionX * flowStrength + -directionY * swirlStrength
        particle.vy += directionY * flowStrength + directionX * swirlStrength

        const localX = particle.x - centerX
        const localY = particle.y - centerY
        const isInsideObstacle =
          Math.abs(localX) < obstacleHalfSize && Math.abs(localY) < obstacleHalfSize

        if (isInsideObstacle) {
          const axisXFirst =
            obstacleHalfSize - Math.abs(localX) < obstacleHalfSize - Math.abs(localY)

          if (axisXFirst) {
            const normal = localX >= 0 ? 1 : -1
            particle.vx += normal * 0.85
            particle.vy += swirlStrength * 4.2
          } else {
            const normal = localY >= 0 ? 1 : -1
            particle.vy += normal * 0.85
            particle.vx -= swirlStrength * 4.2
          }
        }

        particle.vx += Math.cos(timestamp * 0.002 + particle.y * 0.015) * 0.018
        particle.vy += Math.sin(timestamp * 0.002 + particle.x * 0.015) * 0.018
        particle.vx *= 0.985
        particle.vy *= 0.985
        particle.x += particle.vx
        particle.y += particle.vy
        particle.age += 1

        if (
          particle.age >= particle.life ||
          particle.x < -32 ||
          particle.y < -32 ||
          particle.x > width + 32 ||
          particle.y > height + 32
        ) {
          particles.splice(index, 1)
          continue
        }

        const progress = 1 - particle.age / particle.life
        const alpha = Math.max(0.06, progress * 0.7)

        context.beginPath()
        context.strokeStyle =
          particle.emitter === 'bottom-left'
            ? `rgba(71, 192, 160, ${alpha})`
            : `rgba(145, 168, 161, ${alpha})`
        context.lineWidth = particle.size
        context.moveTo(particle.previousX, particle.previousY)
        context.lineTo(particle.x, particle.y)
        context.stroke()
      }

      context.globalCompositeOperation = 'source-over'

      frameHandle = window.requestAnimationFrame(drawFrame)
    }

    frameHandle = window.requestAnimationFrame(drawFrame)

    return () => {
      window.cancelAnimationFrame(frameHandle)
      context.clearRect(0, 0, width, height)
    }
  }, [busyPlaneSize, isBusy, overlaySize.height, overlaySize.width])

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
      <Canvas ref={canvasRef} style={canvasStyle} />
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
          strokeWidth={1.75}
        />
      </Box>
    </Box>
  )
}
