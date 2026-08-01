import { QuizListing, QuizMetadata, quizQuestionCount } from '@/types/quiz'
import { getLocalQuiz } from '@/utils/localQuizzes'

const QUIZ_DATA_BASES = ['/data', '/data/classify']

export async function fetchQuizJson(slug: string): Promise<any | null> {
  for (const base of QUIZ_DATA_BASES) {
    try {
      const response = await fetch(`${base}/${slug}.json`, { cache: 'no-store' })
      if (response.ok) return await response.json()
    } catch {
      continue
    }
  }
  return getLocalQuiz(slug)
}

export interface LoadedQuiz {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  subcategory?: string
  questions: number
  tags: string[]
  hardness: 'easy' | 'medium' | 'hard'
}

async function fetchQuiz(slug: string): Promise<LoadedQuiz | null> {
  try {
    const parsed = await fetchQuizJson(slug)
    if (parsed === null) return null
    const data = Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed
    return {
      id: data.id ?? slug,
      name: data.name ?? slug,
      description: data.description ?? '',
      icon: data.icon ?? '',
      color: data.color ?? 'gray',
      category: data.category ?? 'general',
      subcategory: typeof data.subcategory === 'string' ? data.subcategory : undefined,
      questions: quizQuestionCount(data),
      tags: Array.isArray(data.tags) ? data.tags : [],
      hardness: data.hardness ?? 'easy',
    }
  } catch {
    return null
  }
}

export function toQuizListing(quiz: QuizMetadata): QuizListing {
  return {
    id: quiz.id,
    name: quiz.name,
    description: quiz.description,
    icon: quiz.icon,
    color: quiz.color,
    category: quiz.category,
    subcategory: quiz.subcategory,
    tags: quiz.tags ?? [],
    hardness: quiz.hardness ?? 'easy',
    type: quiz.type,
    seq: quiz.seq,
    questions: quizQuestionCount(quiz),
  }
}

export async function loadFullQuizzes(slugs: string[]): Promise<QuizMetadata[]> {
  const unique = Array.from(new Set(slugs))
  const loaded = await Promise.all(
    unique.map(async (slug) => {
      const parsed = await fetchQuizJson(slug)
      if (parsed === null) return null
      return (Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed) as QuizMetadata
    })
  )
  return loaded.filter((quiz): quiz is QuizMetadata => quiz !== null)
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
