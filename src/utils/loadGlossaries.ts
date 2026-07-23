import type { Glossary, GlossaryGroup, GlossaryMeta } from '@/types/glossary'

function normalizeGroups(raw: unknown): GlossaryGroup[] {
  if (!Array.isArray(raw)) return []
  const groups: GlossaryGroup[] = []

  for (const entry of raw) {
    if (entry && Array.isArray(entry.group)) {
      groups.push({
        groupName: typeof entry.groupName === 'string' ? entry.groupName : null,
        group: entry.group
          .filter((t: unknown): t is { term: string; definition?: string } =>
            !!t && typeof (t as { term?: unknown }).term === 'string'
          )
          .map((t: { term: string; definition?: string }) => ({
            term: t.term,
            definition: t.definition ?? '',
          })),
      })
    } else if (entry && typeof entry.term === 'string') {
      let last = groups[groups.length - 1]
      if (!last || last.groupName !== null) {
        last = { groupName: null, group: [] }
        groups.push(last)
      }
      last.group.push({ term: entry.term, definition: entry.definition ?? '' })
    }
  }

  return groups
}

function termCount(groups: GlossaryGroup[]): number {
  return groups.reduce((sum, g) => sum + g.group.length, 0)
}

export async function fetchGlossary(slug: string): Promise<Glossary | null> {
  try {
    const response = await fetch(`/data/glossaries/${slug}.json`, { cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json()
    return {
      id: data.id ?? slug,
      name: data.name ?? slug,
      description: data.description ?? '',
      category: data.category ?? 'general',
      color: data.color ?? 'gray',
      icon: data.icon ?? '',
      groups: normalizeGroups(data.terms),
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
      .map(({ groups, ...meta }) => ({ ...meta, termCount: termCount(groups) }))
  } catch {
    return []
  }
}
