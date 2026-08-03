import type { Glossary, GlossaryMeta } from '@/types/glossary'
import { writeJsonFile } from '@/utils/localQuizzes'

const STORAGE_KEY = 'polimind.localGlossaries'

function readStore(): Record<string, Glossary> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, Glossary>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getLocalGlossaries(): Glossary[] {
  return Object.values(readStore())
}

export function getLocalGlossaryMetas(): GlossaryMeta[] {
  return getLocalGlossaries().map(({ groups, ...meta }) => ({
    ...meta,
    termCount: groups.reduce((sum, g) => sum + g.group.length, 0),
  }))
}

export function getLocalGlossary(id: string): Glossary | null {
  return readStore()[id] ?? null
}

export function saveLocalGlossary(glossary: Glossary): void {
  const store = readStore()
  store[glossary.id] = glossary
  writeStore(store)
}

export function deleteLocalGlossary(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}

export function hasLocalGlossary(id: string): boolean {
  return id in readStore()
}

/** Serialize to the public glossary data-file shape (`terms` holds the groups). */
export function glossaryToDataFile(glossary: Glossary): Record<string, unknown> {
  return {
    id: glossary.id,
    name: glossary.name,
    description: glossary.description,
    ...(glossary.icon ? { icon: glossary.icon } : {}),
    color: glossary.color,
    category: glossary.category,
    ...(glossary.subcategory ? { subcategory: glossary.subcategory } : {}),
    terms: glossary.groups,
  }
}

export async function downloadLocalGlossary(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const glossary = getLocalGlossary(id)
  if (!glossary) return false
  return writeJsonFile(`${glossary.id}.json`, JSON.stringify(glossaryToDataFile(glossary), null, 2))
}
