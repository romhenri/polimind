import path from 'path'

const DIRS: Record<string, string> = {
  quiz: 'public/data',
  classify: 'public/data/classify',
  glossary: 'public/data/glossaries',
}

export function resolveTargetPath(kind: unknown, id: unknown): string | null {
  const dir = typeof kind === 'string' ? DIRS[kind] : undefined
  if (!dir) return null
  if (typeof id !== 'string' || !id || id !== path.basename(id) || id.includes('..')) return null
  return path.join(process.cwd(), dir, `${id}.json`)
}
