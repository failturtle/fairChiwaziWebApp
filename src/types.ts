export interface Person {
  id: string
  name: string
  color: string
}

export interface Item {
  id: string
  name: string
  cost: number
  assignedTo: string[] // person ids
}

export type Step = 'setup' | 'assign' | 'summary' | 'spin'
