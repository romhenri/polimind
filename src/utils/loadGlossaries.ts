import type { Glossary, GlossaryMeta } from '@/types/glossary'

export async function fetchGlossary(slug: string): Promise<Glossary | null> {
  try {
    const response = await fetch(`/data/glossaries/${slug}.json`, { cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json()
    return {
      id: data.id ?? slug,
      name: data.name ?? slug,
      description: data.description ?? '',
      category: data.category ?? 'General',
      color: data.color ?? 'gray',
      icon: data.icon ?? '',
      terms: Array.isArray(data.terms) ? data.terms : [],
    }
  } catch {
    return null
  }
}

export async function loadGlossaries(): Promise<GlossaryMeta[]> {
  try {
    const listRes = await fetch('/api/glossary-slugs', { cache: 'no-store' })
    if (!listRes.ok) return []
    const { slugs } = (await listRes.json()) as { slugs: string[] }
    const loaded = await Promise.all(slugs.map(fetchGlossary))
    return loaded
      .filter((g): g is Glossary => g !== null)
      .map(({ terms, ...meta }) => ({ ...meta, termCount: terms.length }))
  } catch {
    return []
  }
}
