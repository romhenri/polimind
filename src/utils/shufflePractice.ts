import { Question, QuizMetadata, QuizType, normalizeQuizType } from '@/types/quiz'
import { shuffleQuestionOptions } from '@/utils/shuffleOptions'

export interface PracticeQuestion {
  question: Question
  quizType: QuizType
  lang?: string
  mathEnabled: boolean
}

function isMathQuiz(quiz: QuizMetadata): boolean {
  return (quiz.tags ?? []).some((tag) => tag.toLowerCase() === 'math')
}

function poolQuestions(quizzes: QuizMetadata[]): PracticeQuestion[] {
  const pool: PracticeQuestion[] = []
  for (const quiz of quizzes) {
    const quizType = normalizeQuizType(quiz.type)
    const mathEnabled = isMathQuiz(quiz)
    for (const question of quiz.questions) {
      pool.push({
        question: shuffleQuestionOptions(question, quizType),
        quizType,
        lang: quiz.lang,
        mathEnabled,
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
