import { useState, useRef } from 'react'
import type { Person, Item } from '../types'
import { COLORS } from '../utils/calculations'
import { getClientId, track } from '../utils/api'

interface Props {
  people: Person[]
  setPeople: (p: Person[]) => void
  items: Item[]
  setItems: (i: Item[]) => void
  onNext: () => void
}

let nextId = 100

function genId() {
  return String(++nextId)
}

export default function SetupStep({ people, setPeople, items, setItems, onNext }: Props) {
  const [newPersonName, setNewPersonName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCost, setNewItemCost] = useState('')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addPerson() {
    const name = newPersonName.trim()
    if (!name) return
    const color = COLORS[people.length % COLORS.length]
    setPeople([...people, { id: genId(), name, color }])
    setNewPersonName('')
    track('/api/events/person-added', { name })
  }

  function removePerson(id: string) {
    setPeople(people.filter(p => p.id !== id))
    setItems(items.map(item => ({
      ...item,
      assignedTo: item.assignedTo.filter(pid => pid !== id),
    })))
  }

  function addItem() {
    const name = newItemName.trim()
    const cost = parseFloat(newItemCost)
    if (!name || isNaN(cost) || cost < 0) return
    setItems([...items, { id: genId(), name, cost, assignedTo: [] }])
    setNewItemName('')
    setNewItemCost('')
  }

  function removeItem(id: string) {
    setItems(items.filter(i => i.id !== id))
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setReceiptImage(url)
    setScanError(null)
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('clientId', getClientId())
      formData.append('receipt', file)
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Server error')
      const parsed: { name: string; cost: number }[] = await res.json()
      // A scanned receipt replaces the whole item list, so rescanning doesn't duplicate
      setItems(parsed.map(p => ({ id: genId(), name: p.name, cost: p.cost, assignedTo: [] })))
    } catch {
      setScanError('Could not parse receipt. You can add items manually.')
    } finally {
      setScanning(false)
    }
  }

  const canProceed = people.length >= 2 && items.length >= 1

  return (
    <div className="space-y-8">
      {/* People */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-200">People</h2>
        <div className="space-y-2 mb-3">
          {people.map(person => (
            <div key={person.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: person.color }} />
              <input
                type="text"
                value={person.name}
                onChange={e => setPeople(people.map(p => p.id === person.id ? { ...p, name: e.target.value } : p))}
                className="flex-1 bg-transparent text-slate-200 focus:outline-none focus:border-b border-indigo-500"
              />
              <button
                onClick={() => removePerson(person.id)}
                className="text-slate-500 hover:text-red-400 text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPersonName}
            onChange={e => setNewPersonName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
            placeholder="Add person..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={addPerson}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Items */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-1">
          <h2 className="text-lg font-semibold text-slate-200">Items</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="text-sm text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 transition-colors text-left sm:text-right"
          >
            {scanning ? '⏳ Scanning...' : '📷 Scan receipt with AI'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptUpload}
          />
        </div>

        {scanError && (
          <p className="text-red-400 text-xs mb-2">{scanError}</p>
        )}

        {receiptImage && (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-600">
            <div className="flex items-center justify-between bg-slate-700 px-3 py-2">
              <span className="text-xs text-slate-300">Receipt reference</span>
              <button
                onClick={() => setReceiptImage(null)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>
            <img src={receiptImage} alt="Receipt" className="w-full max-h-64 object-contain bg-slate-900" />
          </div>
        )}

        <div className="space-y-2 mb-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2">
              <input
                type="text"
                value={item.name}
                onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                className="flex-1 bg-transparent text-slate-200 focus:outline-none focus:border-b border-indigo-500"
              />
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                value={item.cost || ''}
                onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, cost: parseFloat(e.target.value) || 0 } : i))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-20 bg-transparent text-green-400 font-mono text-sm focus:outline-none focus:border-b border-indigo-500 text-right"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-500 hover:text-red-400 text-sm transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('cost-input')?.focus()}
            placeholder="Item name..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            id="cost-input"
            type="number"
            value={newItemCost}
            onChange={e => setNewItemCost(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Cost..."
            min="0"
            step="0.01"
            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={addItem}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      <div className="pt-2">
        {!canProceed && (
          <p className="text-slate-500 text-sm mb-3">
            {people.length < 2 ? 'Add at least 2 people. ' : ''}
            {items.length < 1 ? 'Add at least 1 item.' : ''}
          </p>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Next: Assign Items →
        </button>
      </div>
    </div>
  )
}
