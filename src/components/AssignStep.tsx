import type { Person, Item } from '../types'

interface Props {
  people: Person[]
  items: Item[]
  setItems: (items: Item[]) => void
  onBack: () => void
  onNext: () => void
}

export default function AssignStep({ people, items, setItems, onBack, onNext }: Props) {
  function toggleAssignment(itemId: string, personId: string) {
    setItems(items.map(item => {
      if (item.id !== itemId) return item
      const already = item.assignedTo.includes(personId)
      return {
        ...item,
        assignedTo: already
          ? item.assignedTo.filter(id => id !== personId)
          : [...item.assignedTo, personId],
      }
    }))
  }

  function assignAll(itemId: string) {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, assignedTo: people.map(p => p.id) } : item
    ))
  }

  function assignNone(itemId: string) {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, assignedTo: [] } : item
    ))
  }

  const allAssigned = items.every(item => item.assignedTo.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Assign Items</h2>
        <p className="text-sm text-slate-400">
          Select who shares each item. The cost splits equally among selected people.
        </p>
      </div>

      <div className="space-y-4">
        {items.map(item => {
          const shareCount = item.assignedTo.length
          const perPerson = shareCount > 0 ? item.cost / shareCount : item.cost

          return (
            <div key={item.id} className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-medium text-slate-200">{item.name}</span>
                  <div className="text-sm text-slate-400 mt-0.5">
                    <span className="text-green-400 font-mono">${item.cost.toFixed(2)}</span>
                    {shareCount > 1 && (
                      <span className="ml-2 text-slate-500">
                        → ${perPerson.toFixed(2)} each
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => assignAll(item.id)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => assignNone(item.id)}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {people.map(person => {
                  const selected = item.assignedTo.includes(person.id)
                  return (
                    <button
                      key={person.id}
                      onClick={() => toggleAssignment(item.id, person.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selected
                          ? 'text-white shadow-sm scale-105'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                      style={selected ? { background: person.color } : {}}
                    >
                      {selected && <span className="text-xs">✓</span>}
                      {person.name}
                    </button>
                  )
                })}
              </div>

              {item.assignedTo.length === 0 && (
                <p className="text-xs text-amber-500 mt-2">⚠ No one assigned — item won't be counted</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!allAssigned}
          className="flex-2 flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Next: Summary →
        </button>
      </div>
    </div>
  )
}
