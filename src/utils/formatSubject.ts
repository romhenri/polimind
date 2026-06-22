/**
 * Formata um slug de subject para exibição.
 * - Primeira letra de cada palavra em maiúscula
 * - Números no final ganham espaço antes (ex: "javascript1" → "Javascript 1")
 * - Hífens viram espaços (ex: "terminal-linux" → "Terminal Linux")
 */
export function formatSubject(slug: string): string {
  if (!slug || typeof slug !== 'string') return ''
  let s = slug.trim()
  // Hífens viram espaços
  s = s.replace(/-/g, ' ')
  // Espaço antes de números no final (ex: "javascript1" → "javascript 1")
  s = s.replace(/(\D)(\d+)$/, '$1 $2')
  // Primeira letra de cada palavra em maiúscula
  s = s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  return s
}
