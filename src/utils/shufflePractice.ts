import { Question, QuizMetadata, QuizType, normalizeQuizType } from '@/types/quiz'
import { generateClassifyQuestions } from '@/utils/classify/generate'
import { shuffleQuestionOptions } from '@/utils/shuffleOptions'

export interface PracticeQuestion {
  question: Question
  quizType: QuizType
  lang?: string
  mathEnabled: boolean
  source: string
}

export interface ShufflePracticeSelection {
  quizzes: QuizMetadata[]
  count: number
  category: string
}

const SELECTION_STORAGE_KEY = 'polimind.shufflePractice'

export function storeShuffleSelection(selection: ShufflePracticeSelection): void {
  try {
    sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection))
  } catch {
    return
  }
}

export function loadShuffleSelection(): ShufflePracticeSelection | null {
  try {
    const raw = sessionStorage.getItem(SELECTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.quizzes)) return null
    return parsed as ShufflePracticeSelection
  } catch {
    return null
  }
}

function isMathQuiz(quiz: QuizMetadata): boolean {
  return (quiz.tags ?? []).some((tag) => tag.toLowerCase() === 'math')
}

function poolQuestions(quizzes: QuizMetadata[]): PracticeQuestion[] {
  const pool: PracticeQuestion[] = []
  for (const quiz of quizzes) {
    const quizType = normalizeQuizType(quiz.type)
    const mathEnabled = isMathQuiz(quiz)
    const questions =
      quizType === 'classify' && quiz.facets && quiz.entities
        ? generateClassifyQuestions(
            {
              id: quiz.id,
              facets: quiz.facets,
              entities: quiz.entities,
            },
            Math.floor(Date.now() / 1000)
          )
        : quiz.questions ?? []
    for (const question of questions) {
      pool.push({
        question: shuffleQuestionOptions(question, quizType),
        quizType,
        lang: quiz.lang,
        mathEnabled,
        source: quiz.name,
      })
    }
  }
  return pool
}

export function sampleShuffledQuestions(
  quizzes: QuizMetadata[],
  count: number
): PracticeQuestion[] {
  const pool = poolQuestions(quizzes)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(count, pool.length))
}
