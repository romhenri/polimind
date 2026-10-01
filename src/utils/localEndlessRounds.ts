import type { OptionsQuestion } from '@/types/quiz'

const STORAGE_KEY = 'polimind.endlessRounds'

export interface EndlessRound {
  id: string
  topic: string
  category: string
  questions: OptionsQuestion[]
  answers: Record<number, number>
  createdAt: number
  updatedAt: number
}

function readStore(): Record<string, EndlessRound> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, EndlessRound>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getEndlessRounds(): EndlessRound[] {
  return Object.values(readStore()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getEndlessRound(id: string): EndlessRound | null {
  return readStore()[id] ?? null
}

export function saveEndlessRound(round: EndlessRound): void {
  const store = readStore()
  store[round.id] = round
  writeStore(store)
}

export function deleteEndlessRound(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}
