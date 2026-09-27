import type { Person } from '../types'

interface Slice {
  person: Person
  cost: number
  proportion: number
}

interface Props {
  slices: Slice[]
  size?: number
}

export default function PieChart({ slices, size = 240 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 8

  // Build SVG arc paths
  let currentAngle = -Math.PI / 2 // start at top

  const paths = slices.map(slice => {
    const startAngle = currentAngle
    const sweep = slice.proportion * 2 * Math.PI
    const endAngle = startAngle + sweep
    currentAngle = endAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = sweep > Math.PI ? 1 : 0

    const midAngle = startAngle + sweep / 2
    const labelR = r * 0.65
    const labelX = cx + labelR * Math.cos(midAngle)
    const labelY = cy + labelR * Math.sin(midAngle)

    const d =
      slice.proportion >= 1
        ? `M ${cx},${cy - r} A ${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
        : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`

    return { ...slice, d, midAngle, labelX, labelY, startAngle, endAngle }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map(p => (
        <g key={p.person.id}>
          <path
            d={p.d}
            fill={p.person.color}
            stroke="#0f172a"
            strokeWidth={2}
          />
          {p.proportion > 0.06 && (
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size < 200 ? 9 : 11}
              fontWeight="600"
              fill="rgba(0,0,0,0.7)"
            >
              {Math.round(p.proportion * 100)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
