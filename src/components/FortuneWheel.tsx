import { useRef, useEffect, useCallback } from 'react'
import type { Person } from '../types'

interface Segment {
  person: Person
  proportion: number
  startAngle: number // radians, measured from top clockwise
  endAngle: number
}

interface Props {
  segments: Segment[]
  rotation: number // current wheel rotation in radians
  size?: number
}

export default function FortuneWheel({ segments, rotation, size = 340 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displaySize = size
    canvas.width = displaySize * dpr
    canvas.height = displaySize * dpr
    canvas.style.width = `${displaySize}px`
    canvas.style.height = `${displaySize}px`
    ctx.scale(dpr, dpr)

    const cx = displaySize / 2
    const cy = displaySize / 2
    const r = displaySize / 2 - 20

    ctx.clearRect(0, 0, displaySize, displaySize)

    // Shadow under wheel
    ctx.save()
    ctx.shadowColor = 'rgba(99,102,241,0.4)'
    ctx.shadowBlur = 30
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.restore()

    // Draw segments
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation - Math.PI / 2) // offset so angle 0 = top

    for (const seg of segments) {
      const startA = seg.startAngle * 2 * Math.PI
      const endA = seg.endAngle * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, startA, endA)
      ctx.closePath()
      ctx.fillStyle = seg.person.color
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      if (seg.proportion > 0.04) {
        const midA = (startA + endA) / 2
        const labelR = r * 0.68
        const lx = labelR * Math.cos(midA)
        const ly = labelR * Math.sin(midA)

        ctx.save()
        ctx.translate(lx, ly)
        ctx.rotate(midA + Math.PI / 2)
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.font = `bold ${Math.max(10, Math.min(14, r * seg.proportion * 1.8))}px -apple-system,sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const name = seg.person.name
        const pct = `${Math.round(seg.proportion * 100)}%`
        if (seg.proportion > 0.1) {
          ctx.fillText(name, 0, -7)
          ctx.font = `${Math.max(9, Math.min(11, r * seg.proportion))}px -apple-system,sans-serif`
          ctx.fillText(pct, 0, 7)
        } else {
          ctx.fillText(name, 0, 0)
        }
        ctx.restore()
      }
    }

    ctx.restore()

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI)
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 4
    ctx.stroke()

    // Center hub
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#6366f1'
    ctx.fill()

    // Pointer triangle at top
    const pointerY = cy - r - 2
    ctx.beginPath()
    ctx.moveTo(cx, pointerY + 20)
    ctx.lineTo(cx - 12, pointerY - 8)
    ctx.lineTo(cx + 12, pointerY - 8)
    ctx.closePath()
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [segments, rotation, size])

  useEffect(() => {
    draw()
  }, [draw])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export type { Segment }
