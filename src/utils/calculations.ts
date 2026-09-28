import type { Person, Item } from '../types'

export const COLORS = [
  '#FF6B6B', '#367bf2', '#8aff41', '#fbff11', '#ffa7ae',
  '#DDA0DD', '#7EC8E3', '#F7DC6F', '#BB8FCE', '#F1948A',
  '#82E0AA', '#F0B27A', '#AED6F1', '#F9E79F', '#A9DFBF',
]

export function computePersonCosts(people: Person[], items: Item[]): Map<string, number> {
  const costs = new Map<string, number>()
  for (const person of people) {
    costs.set(person.id, 0)
  }
  for (const item of items) {
    if (item.assignedTo.length === 0) continue
    const share = item.cost / item.assignedTo.length
    for (const personId of item.assignedTo) {
      costs.set(personId, (costs.get(personId) ?? 0) + share)
    }
  }
  return costs
}

export function pickWeightedWinner(people: Person[], costs: Map<string, number>): Person {
  const total = Array.from(costs.values()).reduce((a, b) => a + b, 0)
  const r = Math.random() * total
  let cumSum = 0
  for (const person of people) {
    cumSum += costs.get(person.id) ?? 0
    if (r <= cumSum) return person
  }
  return people[people.length - 1]
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}
