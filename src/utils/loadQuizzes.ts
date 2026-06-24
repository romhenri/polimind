export interface LoadedQuiz {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  questions: number
  tags: string[]
  hardness: 'easy' | 'medium' | 'hard'
}

async function fetchQuiz(slug: string): Promise<LoadedQuiz | null> {
  try {
    const response = await fetch(`/data/${slug}.json`, { cache: 'no-store' })
    if (!response.ok) return null
    const parsed = await response.json()
    const data = Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed
    return {
      id: data.id ?? slug,
      name: data.name ?? slug,
      description: data.description ?? '',
      icon: data.icon ?? '',
      color: data.color ?? 'gray',
      category: data.category ?? 'General',
      questions: Array.isArray(data.questions) ? data.questions.length : 0,
      tags: Array.isArray(data.tags) ? data.tags : [],
      hardness: data.hardness ?? 'easy',
    }
  } catch {
    return null
  }
}

export async function loadQuizzesBySlugs(
  slugs: string[]
): Promise<Record<string, LoadedQuiz>> {
  const unique = Array.from(new Set(slugs))
  const loaded = await Promise.all(unique.map(fetchQuiz))
  const map: Record<string, LoadedQuiz> = {}
  unique.forEach((slug, index) => {
    const quiz = loaded[index]
    if (quiz) map[slug] = quiz
  })
  return map
}
