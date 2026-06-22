export type QuizType = 'bool' | 'options'

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

export type Question = OptionsQuestion | BoolQuestion

export interface QuizMetadata {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  tags: string[]
  questions: Question[]
  hardness?: 'easy' | 'medium' | 'hard'
  seq?: number
  lang?: string
  type?: QuizType
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
  return type === 'bool' ? 'bool' : 'options'
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
