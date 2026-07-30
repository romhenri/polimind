import { OptionsQuestion, Question, QuizType } from '@/types/quiz'

const ANCHORED_OPTION = /\b(all|none|both)\s+of\s+the\s+(above|options|others)\b|\btodas\s+as\s+(alternativas|anteriores|acima)\b|\bnenhuma\s+das\s+(alternativas|anteriores|acima)\b|\ball\s+answers\b/i

function isOptionsQuestion(question: Question): question is OptionsQuestion {
  return (
    'options' in question &&
    Array.isArray(question.options) &&
    typeof question.correctAnswer === 'number'
  )
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function shuffleQuestionOptions(question: Question, quizType: QuizType): Question {
  if (quizType !== 'options' || !isOptionsQuestion(question)) return question

  const { options, correctAnswer } = question
  if (options.length < 2) return question
  if (correctAnswer < 0 || correctAnswer >= options.length) return question

  const movable: number[] = []
  for (let i = 0; i < options.length; i++) {
    if (!ANCHORED_OPTION.test(options[i])) movable.push(i)
  }
  if (movable.length < 2) return question

  const permuted = shuffled(movable)
  const order = options.map((_, i) => i)
  movable.forEach((slot, k) => {
    order[slot] = permuted[k]
  })

  return {
    ...question,
    options: order.map((i) => options[i]),
    correctAnswer: order.indexOf(correctAnswer),
  }
}

export function shuffleAllQuestionOptions(
  questions: Question[],
  quizType: QuizType
): Question[] {
  return questions.map((question) => shuffleQuestionOptions(question, quizType))
}
