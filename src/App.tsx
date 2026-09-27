import { useState, useEffect } from 'react'
import type { Person, Item, Step } from './types'
import { COLORS } from './utils/calculations'
import SetupStep from './components/SetupStep'
import AssignStep from './components/AssignStep'
import SummaryStep from './components/SummaryStep'
import SpinStep from './components/SpinStep'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'assign', label: 'Assign' },
  { key: 'summary', label: 'Summary' },
  { key: 'spin', label: 'Spin' },
]

export default function App() {
  const [step, setStep] = useState<Step>('setup')
  const [people, setPeople] = useState<Person[]>(() =>
    load('fc:people', [
      { id: '1', name: 'Clement', color: COLORS[0] },
      { id: '2', name: 'Piggy', color: COLORS[1] },
      { id: '3', name: 'Piggatron', color: COLORS[2] },
    ])
  )
  const [items, setItems] = useState<Item[]>(() =>
    load('fc:items', [
      { id: '1', name: 'Item 1', cost: 0, assignedTo: [] },
      { id: '2', name: 'Item 2', cost: 0, assignedTo: [] },
      { id: '3', name: 'Item 3', cost: 0, assignedTo: [] },
    ])
  )

  useEffect(() => { save('fc:people', people) }, [people])
  useEffect(() => { save('fc:items', items) }, [items])

  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Fair Chiwazi</h1>
            <p className="text-xs text-slate-400">Weighted credit card roulette</p>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (i <= stepIndex) setStep(s.key)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    s.key === step
                      ? 'bg-indigo-600 text-white'
                      : i < stepIndex
                      ? 'bg-slate-600 text-slate-200 hover:bg-slate-500 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-default'
                  }`}
                >
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <span className="text-slate-600 text-xs">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {step === 'setup' && (
            <SetupStep
              people={people}
              setPeople={setPeople}
              items={items}
              setItems={setItems}
              onNext={() => setStep('assign')}
            />
          )}
          {step === 'assign' && (
            <AssignStep
              people={people}
              items={items}
              setItems={setItems}
              onBack={() => setStep('setup')}
              onNext={() => setStep('summary')}
            />
          )}
          {step === 'summary' && (
            <SummaryStep
              people={people}
              items={items}
              onBack={() => setStep('assign')}
              onSpin={() => setStep('spin')}
            />
          )}
          {step === 'spin' && (
            <SpinStep
              people={people}
              items={items}
              onBack={() => setStep('summary')}
            />
          )}
        </div>
      </main>
    </div>
  )
}
