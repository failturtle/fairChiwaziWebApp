import { useState, useRef, useEffect } from 'react'
import type { Person, Item } from '../types'
import { computePersonCosts, pickWeightedWinner, formatCurrency } from '../utils/calculations'
import FortuneWheel from './FortuneWheel'
import type { Segment } from './FortuneWheel'

interface Props {
  people: Person[]
  items: Item[]
  onBack: () => void
}

type SpinState = 'idle' | 'spinning' | 'done'

const SPIN_DURATION_MS = 5000
const MIN_ROTATIONS = 6

function easeOut(t: number): number {
  // Cubic + extra punch: fast start, smooth deceleration
  return 1 - Math.pow(1 - t, 4)
}

export default function SpinStep({ people, items, onBack }: Props) {
  const costs = computePersonCosts(people, items)
  const total = Array.from(costs.values()).reduce((a, b) => a + b, 0)

  // Build segments (proportions, cumulative angles)
  const segments: Segment[] = []
  let cumulative = 0
  for (const person of people) {
    const cost = costs.get(person.id) ?? 0
    const proportion = total > 0 ? cost / total : 1 / people.length
    segments.push({
      person,
      proportion,
      startAngle: cumulative,
      endAngle: cumulative + proportion,
    })
    cumulative += proportion
  }

  const [rotation, setRotation] = useState(0)
  const [spinState, setSpinState] = useState<SpinState>('idle')
  const [winner, setWinner] = useState<Person | null>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const startRotationRef = useRef<number>(0)
  const targetRotationRef = useRef<number>(0)

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  function spin() {
    if (spinState === 'spinning') return

    // Pick winner
    const w = pickWeightedWinner(people, costs)
    setWinner(null)
    setSpinState('spinning')

    // Find winner's segment
    const winnerSeg = segments.find(s => s.person.id === w.id)!

    // The pointer is at the top (angle = -π/2 in canvas coords)
    // After wheel rotation R (radians), the top of the wheel shows:
    //   angle_in_wheel_frame = (-R) mod 2π  (since we rotate the wheel by R)
    //   but our segments use [0,1] for full circle starting at top
    //   so normalized position at pointer = ((-R) / (2π)) mod 1
    //
    // We want this to land inside [winnerSeg.startAngle, winnerSeg.endAngle]
    // Pick a random point inside (with 10% padding from edges)
    const pad = winnerSeg.proportion * 0.15
    const targetNorm = winnerSeg.startAngle + pad +
      Math.random() * (winnerSeg.proportion - 2 * pad)

    // Solve: (-R / 2π) mod 1 = targetNorm
    // => R / 2π = -targetNorm mod 1 = (1 - targetNorm) mod 1
    // => R = (1 - targetNorm) * 2π  + N * 2π
    const baseR = (1 - targetNorm) * 2 * Math.PI
    const normalizedBase = ((baseR % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const currentNorm = (((-rotation) / (2 * Math.PI)) % 1 + 1) % 1

    // Extra rotation to add on top of normalizedBase to ensure minimum spins
    let delta = normalizedBase - ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (delta < 0) delta += 2 * Math.PI
    const finalRotation = rotation + MIN_ROTATIONS * 2 * Math.PI + delta

    // Silence unused variable warning
    void currentNorm

    startRotationRef.current = rotation
    targetRotationRef.current = finalRotation
    startTimeRef.current = performance.now()

    function animate(now: number) {
      const elapsed = now - startTimeRef.current
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1)
      const easedT = easeOut(t)
      const currentR = startRotationRef.current +
        (targetRotationRef.current - startRotationRef.current) * easedT

      setRotation(currentR)

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setRotation(targetRotationRef.current)
        setWinner(w)
        setSpinState('done')
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  const wheelSize = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 48 : 340)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Fortune Wheel</h2>
        <p className="text-sm text-slate-400">
          Probabilities are proportional to each person's spend.
        </p>
      </div>

      {/* Wheel */}
      <div className="flex justify-center">
        <FortuneWheel segments={segments} rotation={rotation} size={wheelSize} />
      </div>

      {/* Winner announcement */}
      {winner && (
        <div
          className="rounded-2xl p-5 text-center border-2 animate-pulse"
          style={{ borderColor: winner.color, background: winner.color + '15' }}
        >
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-2xl font-bold" style={{ color: winner.color }}>
            {winner.name} pays!
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Had a {((costs.get(winner.id) ?? 0) / total * 100).toFixed(1)}% chance
            ({formatCurrency(costs.get(winner.id) ?? 0)} of {formatCurrency(total)})
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={spinState === 'spinning'}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          ← Back
        </button>

        {spinState === 'done' ? (
          <button
            onClick={spin}
            className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
          >
            🔄 Spin Again
          </button>
        ) : (
          <button
            onClick={spin}
            disabled={spinState === 'spinning'}
            className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg"
          >
            {spinState === 'spinning' ? '⏳ Spinning...' : '🎰 Spin!'}
          </button>
        )}
      </div>

      {/* Odds reference */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Odds</h3>
        <div className="space-y-2">
          {segments.sort((a, b) => b.proportion - a.proportion).map(seg => (
            <div key={seg.person.id} className="flex items-center gap-3">
              <div
                className="h-2 rounded-full flex-shrink-0"
                style={{ background: seg.person.color, width: `${Math.max(4, seg.proportion * 120)}px` }}
              />
              <span className="text-slate-300 text-sm flex-1">{seg.person.name}</span>
              <span className="text-slate-400 text-sm font-mono">
                {formatCurrency(costs.get(seg.person.id) ?? 0)}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: seg.person.color + '33', color: seg.person.color }}
              >
                {(seg.proportion * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
