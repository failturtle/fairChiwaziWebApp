import type { Person, Item } from '../types'
import { computePersonCosts, formatCurrency } from '../utils/calculations'
import PieChart from './PieChart'

interface Props {
  people: Person[]
  items: Item[]
  onBack: () => void
  onSpin: () => void
}

export default function SummaryStep({ people, items, onBack, onSpin }: Props) {
  const costs = computePersonCosts(people, items)
  const total = Array.from(costs.values()).reduce((a, b) => a + b, 0)

  const slices = people
    .map(p => ({
      person: p,
      cost: costs.get(p.id) ?? 0,
      proportion: total > 0 ? (costs.get(p.id) ?? 0) / total : 0,
    }))
    .sort((a, b) => b.cost - a.cost)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Summary</h2>
        <p className="text-sm text-slate-400">
          Each person's spin probability is proportional to what they ordered.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
        {/* Pie chart */}
        <div className="flex-shrink-0">
          <PieChart slices={slices} size={Math.min(240, typeof window !== 'undefined' ? window.innerWidth - 48 : 240)} />
        </div>

        {/* Legend / breakdown */}
        <div className="w-full sm:w-auto space-y-2">
          {slices.map(s => (
            <div
              key={s.person.id}
              className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2.5"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: s.person.color }}
              />
              <span className="flex-1 font-medium text-slate-200">{s.person.name}</span>
              <span className="font-mono text-green-400 text-sm">{formatCurrency(s.cost)}</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: s.person.color + '33', color: s.person.color }}
              >
                {(s.proportion * 100).toFixed(1)}%
              </span>
            </div>
          ))}

          <div className="flex items-center gap-3 rounded-lg px-4 py-2 border-t border-slate-700 mt-1 pt-3">
            <span className="flex-1 text-slate-400 text-sm">Total</span>
            <span className="font-mono text-white font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onSpin}
          className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
        >
          🎰 Spin the Wheel!
        </button>
      </div>
    </div>
  )
}
