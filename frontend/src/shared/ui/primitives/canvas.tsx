import * as React from 'react'

export type CanvasProps = React.CanvasHTMLAttributes<HTMLCanvasElement>

const canvasStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
}

export const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(
  { style, ...props },
  ref,
) {
  return <canvas {...props} ref={ref} style={{ ...canvasStyle, ...style }} />
})
