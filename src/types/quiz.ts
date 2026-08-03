export type QuizType = 'bool' | 'options' | 'classify'

export interface OptionsQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explain?: string
}

export interface BoolQuestion {
  question: string
  result: boolean
  explain?: string
}

export interface ClassifyGroup {
  id: string
  label: string
  parentGroup?: string
}

export interface ClassifyFacet {
  id: string
  label: string
  prompt: string
  parent?: string
  groups: ClassifyGroup[]
}

export interface ClassifyEntity {
  id: string
  entity: string
  subtitle?: string
  answers: Record<string, string>
  explain?: Record<string, string>
}

export interface ClassifyQuizData {
  id: string
  facets: ClassifyFacet[]
  entities: ClassifyEntity[]
}

export interface ClassifyQuestion extends OptionsQuestion {
  entity: string
  subtitle?: string
}

export type Question = OptionsQuestion | BoolQuestion | ClassifyQuestion

export interface QuizMetadata {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  subcategory?: string
  tags: string[]
  questions: Question[]
  hardness?: 'easy' | 'medium' | 'hard'
  seq?: number
  lang?: string
  type?: QuizType
  facets?: ClassifyFacet[]
  entities?: ClassifyEntity[]
}

export interface QuizListing {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  subcategory?: string
  tags: string[]
  hardness: 'easy' | 'medium' | 'hard'
  type?: QuizType
  seq?: number
  questions: number
}

export const CLASSIFY_QUESTIONS_PER_RUN = 10

export function quizQuestionCount(
  quiz: Pick<QuizMetadata, 'type' | 'questions' | 'entities'>
): number {
  if (normalizeQuizType(quiz.type) === 'classify' && Array.isArray(quiz.entities)) {
    const pool = quiz.entities.reduce(
      (acc, entity) => acc + Object.keys(entity.answers ?? {}).length,
      0
    )
    return Math.min(CLASSIFY_QUESTIONS_PER_RUN, pool)
  }
  return Array.isArray(quiz.questions) ? quiz.questions.length : 0
}

export interface Answer {
  questionIndex: number
  selectedAnswer: number
  isCorrect: boolean
  timeTaken: number
  wasAttempted: boolean
}

export interface QuizState {
  currentQuestionIndex: number
  answers: Answer[]
  startTime: number
  questionTimes: number[]
  isFinished: boolean
}

export function normalizeQuizType(type?: QuizType | string): QuizType {
  if (type === 'bool') return 'bool'
  if (type === 'classify') return 'classify'
  return 'options'
}

export function isAnswerCorrect(
  question: Question,
  quizType: QuizType,
  selectedAnswer: number
): boolean {
  if (quizType === 'bool' && 'result' in question) {
    if (selectedAnswer < 0) return false
    return (selectedAnswer === 1) === question.result
  }
  if ('correctAnswer' in question && typeof question.correctAnswer === 'number') {
    return selectedAnswer === question.correctAnswer
  }
  return false
}

export function boolLabel(value: boolean, lang?: string): string {
  if (lang === 'pt') return value ? 'Verdadeiro' : 'Falso'
  return value ? 'True' : 'False'
}

export function correctBoolIndex(result: boolean): number {
  return result ? 1 : 0
}

export function formatUserAnswerText(
  question: Question,
  quizType: QuizType,
  selectedAnswer: number,
  wasAttempted: boolean,
  lang?: string
): string {
  if (!wasAttempted) {
    return lang === 'pt' ? 'Sem resposta' : 'No answer'
  }
  if (quizType === 'bool') {
    if (selectedAnswer < 0) {
      return lang === 'pt' ? 'Sem resposta' : 'No answer'
    }
    return boolLabel(selectedAnswer === 1, lang)
  }
  if ('options' in question && selectedAnswer >= 0 && selectedAnswer < question.options.length) {
    return question.options[selectedAnswer]
  }
  return ''
}

export function formatCorrectAnswerText(
  question: Question,
  quizType: QuizType,
  lang?: string
): string {
  if (quizType === 'bool' && 'result' in question) {
    return boolLabel(question.result, lang)
  }
  if ('options' in question && typeof question.correctAnswer === 'number') {
    return question.options[question.correctAnswer] ?? ''
  }
  return ''
}
