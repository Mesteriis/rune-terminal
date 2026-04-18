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
  noiseOffset: number
  previousX: number
  previousY: number
  size: number
  speed: number
  targetIndex: number
  x: number
  y: number
  vx: number
  vy: number
}

const BUSY_ICON_AREA_RATIO = 0.2
const PARTICLE_LIMIT = 192
const EMITTER_MARGIN = 18
const COLLISION_RADIUS = 16
const COLLISION_PUSH = 0.024
const COLLISION_SWIRL = 0.011

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

function createParticle(
  centerX: number,
  centerY: number,
  busyPlaneSize: number,
  emitter: Particle['emitter'],
): Particle {
  const margin = EMITTER_MARGIN
  const fromBottomLeft = emitter === 'bottom-left'
  const orbitRadius = busyPlaneSize * 0.44
  const x = fromBottomLeft
    ? centerX - orbitRadius * 1.95 - Math.random() * orbitRadius * 1.1
    : centerX + orbitRadius * 1.95 + Math.random() * orbitRadius * 1.1
  const y = fromBottomLeft
    ? centerY + orbitRadius * 1.95 + Math.random() * orbitRadius * 1.1
    : centerY - orbitRadius * 1.95 - Math.random() * orbitRadius * 1.1

  return {
    emitter,
    x,
    y,
    previousX: x,
    previousY: y,
    vx: fromBottomLeft ? 0.36 + Math.random() * 0.18 : -0.36 - Math.random() * 0.18,
    vy: fromBottomLeft ? -0.42 - Math.random() * 0.18 : 0.42 + Math.random() * 0.18,
    size: 1 + Math.random() * 1.8,
    age: 0,
    life: 120 + Math.random() * 54,
    noiseOffset: Math.random() * Math.PI * 2,
    targetIndex: 0,
    speed: 0.032 + Math.random() * 0.018,
  }
}

function getRoutePoints(
  centerX: number,
  centerY: number,
  busyPlaneSize: number,
  emitter: Particle['emitter'],
) {
  const orbitRadius = busyPlaneSize * 0.44
  const path = [
    { x: centerX - orbitRadius * 1.55, y: centerY + orbitRadius * 1.2 },
    { x: centerX - orbitRadius * 0.72, y: centerY + orbitRadius * 0.22 },
    { x: centerX - orbitRadius * 0.06, y: centerY + orbitRadius * 1.18 },
    { x: centerX + orbitRadius * 0.2, y: centerY + orbitRadius * 0.1 },
    { x: centerX + orbitRadius * 1.1, y: centerY - orbitRadius * 0.04 },
    { x: centerX + orbitRadius * 0.18, y: centerY - orbitRadius * 0.18 },
    { x: centerX + orbitRadius * 0.02, y: centerY - orbitRadius * 1.18 },
    { x: centerX - orbitRadius * 0.18, y: centerY - orbitRadius * 0.14 },
    { x: centerX - orbitRadius * 1.05, y: centerY - orbitRadius * 0.02 },
    { x: centerX + orbitRadius * 1.7, y: centerY - orbitRadius * 1.42 },
  ]

  return emitter === 'bottom-left' ? path : [...path].reverse()
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
    const attractorX = centerX
    const attractorY = centerY + busyPlaneSize * 0.12
    const routePointsBottomLeft = getRoutePoints(centerX, centerY, busyPlaneSize, 'bottom-left')
    const routePointsTopRight = getRoutePoints(centerX, centerY, busyPlaneSize, 'top-right')

    canvas.width = Math.round(width * devicePixelRatio)
    canvas.height = Math.round(height * devicePixelRatio)
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

    let frameHandle = 0

    const spawnParticles = () => {
      if (particles.length >= PARTICLE_LIMIT) {
        return
      }

      const budget = Math.min(6, PARTICLE_LIMIT - particles.length)

      for (let index = 0; index < budget; index += 1) {
        particles.push(
          createParticle(
            centerX,
            centerY,
            busyPlaneSize,
            index % 2 === 0 ? 'bottom-left' : 'top-right',
          ),
        )
      }
    }

    const drawFrame = (timestamp: number) => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'

      if (particles.length < PARTICLE_LIMIT) {
        spawnParticles()
      }

      for (let sourceIndex = 0; sourceIndex < particles.length; sourceIndex += 1) {
        const source = particles[sourceIndex]

        for (let targetIndex = sourceIndex + 1; targetIndex < particles.length; targetIndex += 1) {
          const target = particles[targetIndex]
          const dx = target.x - source.x
          const dy = target.y - source.y
          const distance = Math.max(Math.hypot(dx, dy), 0.001)

          if (distance > COLLISION_RADIUS) {
            continue
          }

          const overlap = 1 - distance / COLLISION_RADIUS
          const normalX = dx / distance
          const normalY = dy / distance
          const tangentX = -normalY
          const tangentY = normalX
          const swirlDirection =
            source.emitter === target.emitter
              ? source.emitter === 'bottom-left'
                ? 1
                : -1
              : Math.sign(source.vx - target.vx || 1)
          const pushForce = overlap * COLLISION_PUSH
          const swirlForce = overlap * COLLISION_SWIRL * swirlDirection

          source.vx -= normalX * pushForce
          source.vy -= normalY * pushForce
          target.vx += normalX * pushForce
          target.vy += normalY * pushForce

          source.vx += tangentX * swirlForce
          source.vy += tangentY * swirlForce
          target.vx -= tangentX * swirlForce
          target.vy -= tangentY * swirlForce
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        const routePoints =
          particle.emitter === 'bottom-left' ? routePointsBottomLeft : routePointsTopRight
        const targetPoint = routePoints[Math.min(particle.targetIndex, routePoints.length - 1)]
        const dx = attractorX - particle.x
        const dy = attractorY - particle.y
        const distance = Math.max(Math.hypot(dx, dy), 1)
        const directionX = dx / distance
        const directionY = dy / distance
        const swirlStrength = particle.emitter === 'bottom-left' ? -0.082 : 0.082
        const targetDx = targetPoint.x - particle.x
        const targetDy = targetPoint.y - particle.y
        const targetDistance = Math.max(Math.hypot(targetDx, targetDy), 1)
        const targetDirectionX = targetDx / targetDistance
        const targetDirectionY = targetDy / targetDistance
        const orbitBand = busyPlaneSize * 0.54
        const orbitPull = Math.max(-1, Math.min(1, (distance - orbitBand) / orbitBand))
        const attractorPull = Math.min(0.028, 280 / (distance * distance))
        const chaosStrength =
          0.016 +
          Math.sin(timestamp * 0.0012 + particle.noiseOffset + particle.age * 0.03) * 0.006

        particle.previousX = particle.x
        particle.previousY = particle.y

        particle.vx += targetDirectionX * particle.speed
        particle.vy += targetDirectionY * particle.speed
        particle.vx += -directionY * swirlStrength
        particle.vy += directionX * swirlStrength
        particle.vx += directionX * orbitPull * 0.02
        particle.vy += directionY * orbitPull * 0.02
        particle.vx += directionX * attractorPull
        particle.vy += directionY * attractorPull

        if (targetDistance < Math.max(18, busyPlaneSize * 0.08) && particle.targetIndex < routePoints.length - 1) {
          particle.targetIndex += 1
        }

        particle.vx += Math.cos(timestamp * 0.0018 + particle.y * 0.014 + particle.noiseOffset) * chaosStrength
        particle.vy += Math.sin(timestamp * 0.0016 + particle.x * 0.014 + particle.noiseOffset) * chaosStrength
        particle.vx *= 0.968
        particle.vy *= 0.968
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
        const alpha = Math.max(0.04, progress * 0.48)

        context.beginPath()
        context.strokeStyle =
          particle.emitter === 'bottom-left'
            ? `rgba(71, 192, 160, ${alpha})`
            : `rgba(145, 168, 161, ${alpha})`
        context.lineWidth = particle.size
        context.moveTo(particle.previousX, particle.previousY)
        context.lineTo(particle.x, particle.y)
        context.stroke()

        context.beginPath()
        context.fillStyle =
          particle.emitter === 'bottom-left'
            ? `rgba(71, 192, 160, ${alpha * 0.7})`
            : `rgba(145, 168, 161, ${alpha * 0.7})`
        context.arc(particle.x, particle.y, particle.size * 0.55, 0, Math.PI * 2)
        context.fill()
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
          style={{ filter: 'drop-shadow(0 0 18px rgba(237, 247, 244, 0.16))' }}
          strokeWidth={1.75}
        />
      </Box>
    </Box>
  )
}
