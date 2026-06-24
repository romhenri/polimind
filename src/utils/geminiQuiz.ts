import { QuizMetadata, OptionsQuestion } from '@/types/quiz'
import { AVAILABLE_COLORS } from '@/utils/colorMapper'
import { formatSubject } from '@/utils/formatSubject'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
]

class GeminiError extends Error {
  retryable: boolean
  constructor(message: string, retryable: boolean) {
    super(message)
    this.retryable = retryable
  }
}

const COLOR_KEYS = Object.keys(AVAILABLE_COLORS)
const HARDNESS_VALUES = ['easy', 'medium', 'hard'] as const

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string', enum: COLOR_KEYS },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    hardness: { type: 'string', enum: [...HARDNESS_VALUES] },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswer: { type: 'integer' },
          explain: { type: 'string' },
        },
        required: ['question', 'options', 'correctAnswer', 'explain'],
      },
    },
  },
  required: ['id', 'name', 'description', 'color', 'category', 'tags', 'hardness', 'questions'],
}

function buildPrompt(subject: string, count: number): string {
  return [
    'You are a quiz generator for "polimind", a learning platform.',
    'Generate one high-quality multiple-choice quiz as a single JSON object that follows the exact structure required by the platform.',
    '',
    'Rules:',
    '- "id": a short lowercase kebab-case slug derived from the subject (only [a-z0-9-], no spaces).',
    '- "name": a concise, human-readable title.',
    '- "description": one engaging sentence describing the quiz.',
    `- "color": pick exactly ONE from this list: ${COLOR_KEYS.join(', ')}.`,
    '- "category": a single broad subject area (e.g. History, Science, Programming, Math).',
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": one of ${HARDNESS_VALUES.join(', ')}.`,
    `- "questions": exactly ${count} items. Each item has:`,
    '    - "question": the question text.',
    '    - "options": an array of exactly 4 plausible answer strings.',
    '    - "correctAnswer": the 0-based index (0 to 3) of the correct option.',
    '    - "explain": one short sentence explaining why the answer is correct.',
    '- Exactly one option is correct, and vary the position of the correct answer across questions.',
    '- Write everything in English. Output only the JSON object, with no extra text.',
    '',
    `Subject: ${subject}`,
    `Number of questions: ${count}`,
  ].join('\n')
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'ai-quiz'
}

function parseGeminiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body)
    const message = parsed?.error?.message
    if (typeof message === 'string' && message.trim()) return message
  } catch {
    // ignore non-JSON error bodies
  }
  if (status === 400 || status === 403) return 'Invalid API key or request rejected by Gemini.'
  if (status === 429) return 'Rate limit reached. Wait a moment and try again.'
  return `Gemini request failed (status ${status}).`
}

function normalizeQuiz(raw: unknown, fallbackSubject: string): QuizMetadata {
  if (!raw || typeof raw !== 'object') {
    throw new Error('The model did not return a valid quiz object.')
  }
  const data = raw as Record<string, unknown>
  const rawQuestions = Array.isArray(data.questions) ? data.questions : []

  const questions: OptionsQuestion[] = rawQuestions
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const q = item as Record<string, unknown>
      const options = Array.isArray(q.options) ? q.options.map(String) : []
      const correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : -1
      if (typeof q.question !== 'string' || !q.question.trim()) return null
      if (options.length < 2) return null
      if (correctAnswer < 0 || correctAnswer >= options.length) return null
      const question: OptionsQuestion = {
        question: q.question.trim(),
        options,
        correctAnswer,
      }
      if (typeof q.explain === 'string' && q.explain.trim()) {
        question.explain = q.explain.trim()
      }
      return question
    })
    .filter((q): q is OptionsQuestion => q !== null)

  if (questions.length === 0) {
    throw new Error('The generated quiz had no valid questions.')
  }

  const id = slugify((typeof data.id === 'string' && data.id) || (typeof data.name === 'string' && data.name) || fallbackSubject)
  const color = typeof data.color === 'string' && COLOR_KEYS.includes(data.color) ? data.color : 'purple'
  const hardness = HARDNESS_VALUES.includes(data.hardness as (typeof HARDNESS_VALUES)[number])
    ? (data.hardness as (typeof HARDNESS_VALUES)[number])
    : 'medium'

  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : formatSubject(id),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    icon: '',
    color,
    category: typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'General',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    hardness,
    type: 'options',
    questions,
  }
}

export function quizToDataFile(quiz: QuizMetadata): Record<string, unknown> {
  return {
    id: quiz.id,
    name: quiz.name,
    description: quiz.description,
    color: quiz.color,
    category: quiz.category,
    tags: quiz.tags,
    hardness: quiz.hardness,
    type: quiz.type,
    questions: quiz.questions,
  }
}

export interface GeneratedQuiz {
  quiz: QuizMetadata
  model: string
}

async function requestModel(apiKey: string, model: string, subject: string, count: number): Promise<QuizMetadata> {
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(subject, count) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.8,
      },
    }),
  })

  if (!response.ok) {
    const retryable = response.status === 404 || response.status === 429 || response.status >= 500
    throw new GeminiError(parseGeminiError(response.status, await response.text()), retryable)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new GeminiError('Gemini returned an empty response.', true)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new GeminiError('Gemini returned malformed JSON.', true)
  }

  return normalizeQuiz(parsed, subject)
}

export async function generateQuiz(apiKey: string, subject: string, count: number): Promise<GeneratedQuiz> {
  let lastError: Error | null = null

  for (const model of GEMINI_MODELS) {
    try {
      const quiz = await requestModel(apiKey, model, subject, count)
      return { quiz, model }
    } catch (err) {
      if (err instanceof GeminiError && !err.retryable) throw err
      lastError = err instanceof Error ? err : new Error('Unknown error.')
    }
  }

  throw new Error(
    lastError
      ? `All available models failed. Last error: ${lastError.message}`
      : 'All Gemini models are unavailable right now. Try again later.'
  )
}
