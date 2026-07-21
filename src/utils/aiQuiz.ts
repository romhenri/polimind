import { QuizMetadata, OptionsQuestion } from '@/types/quiz'
import { AVAILABLE_COLORS } from '@/utils/colorMapper'
import { formatSubject } from '@/utils/formatSubject'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const OPENROUTER_MODELS = ['openrouter/free']

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
]

export type AiProvider = 'openrouter' | 'gemini'

export interface AiSettings {
  provider: AiProvider
  apiKey: string
  temperature: number
}

export const QUIZ_CATEGORIES = [
  'General',
  'History',
  'Science',
  'Programming',
  'Computing',
  'Math',
  'Data',
]

function providerName(provider: AiProvider): string {
  return provider === 'openrouter' ? 'OpenRouter' : 'Gemini'
}

function providerModels(provider: AiProvider): string[] {
  return provider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS
}

class AiProviderError extends Error {
  retryable: boolean
  constructor(message: string, retryable: boolean) {
    super(message)
    this.retryable = retryable
  }
}

const COLOR_KEYS = Object.keys(AVAILABLE_COLORS)
const HARDNESS_VALUES = ['easy', 'medium', 'hard'] as const

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correctAnswer: { type: 'integer' },
    explain: { type: 'string' },
  },
  required: ['question', 'options', 'correctAnswer', 'explain'],
}

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
      items: QUESTION_SCHEMA,
    },
  },
  required: ['id', 'name', 'description', 'color', 'category', 'tags', 'hardness', 'questions'],
}

function buildPrompt(subject: string, count: number, category: string): string {
  return [
    'You are a quiz generator for "polimind", a learning platform.',
    'Generate one high-quality multiple-choice quiz as a single JSON object that follows the exact structure required by the platform.',
    '',
    'Rules:',
    '- "id": a short lowercase kebab-case slug derived from the subject (only [a-z0-9-], no spaces).',
    '- "name": a concise, human-readable title.',
    '- "description": one engaging sentence describing the quiz.',
    `- "color": pick exactly ONE from this list: ${COLOR_KEYS.join(', ')}.`,
    `- "category": use exactly "${category}".`,
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": one of ${HARDNESS_VALUES.join(', ')}.`,
    `- "questions": exactly ${count} items. Each item has:`,
    '    - "question": the question text.',
    '    - "options": an array of exactly 4 plausible answer strings.',
    '    - "correctAnswer": the 0-based index (0 to 3) of the correct option.',
    '    - "explain": one short sentence explaining why the answer is correct.',
    '- Exactly one option is correct, and vary the position of the correct answer across questions.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
    '- Write everything in English (id too). Output only the JSON object, with no extra text.',
    '',
    `Subject: ${subject}`,
    `Number of questions: ${count}`,
  ].join('\n')
}

export function buildCopyPrompt(subject: string, count: number, category: string): string {
  const subjectLine = subject.trim() || '<describe your subject here>'
  return [
    'You are a quiz generator for "polimind", a learning platform.',
    'Create one high-quality multiple-choice quiz about the subject below and return it as a SINGLE JSON object — no markdown, no code fences, no comments, no extra text.',
    '',
    'Output EXACTLY this shape:',
    '{',
    '  "id": "kebab-case-slug",',
    '  "name": "Concise human-readable title",',
    '  "description": "One engaging sentence describing the quiz.",',
    `  "color": "one of: ${COLOR_KEYS.join(', ')}",`,
    `  "category": "${category}",`,
    '  "tags": ["two", "to", "four", "keywords"],',
    `  "hardness": "one of: ${HARDNESS_VALUES.join(', ')}",`,
    '  "type": "options",',
    '  "questions": [',
    '    {',
    '      "question": "The question text",',
    '      "options": ["option A", "option B", "option C", "option D"],',
    '      "correctAnswer": 0,',
    '      "explain": "One short sentence on why the answer is correct."',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- "id": lowercase kebab-case slug from the subject, only [a-z0-9-], no spaces.',
    `- "color": pick exactly ONE from: ${COLOR_KEYS.join(', ')}.`,
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": exactly one of ${HARDNESS_VALUES.join(', ')}.`,
    '- "type": keep it as "options".',
    `- "questions": exactly ${count} items, each with exactly 4 plausible options.`,
    '- "correctAnswer": 0-based index (0 to 3) of the correct option; exactly one option is correct.',
    '- Vary the position of the correct answer across questions.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
    '- Just Content on Title. Do not put words as: quiz, fundamentals, test or any equivalent in the title.',
    '- Write everything in English (including "id"). Output ONLY the JSON object.',
    '',
    `Subject: ${subjectLine}`,
    `Number of questions: ${count}`,
  ].join('\n')
}

function buildQuestionPrompt(quiz: QuizMetadata, index: number): string {
  const current = quiz.questions[index]
  const others = quiz.questions
    .filter((_, i) => i !== index)
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n')

  return [
    'You are a quiz generator for "polimind", a learning platform.',
    `Generate exactly ONE new multiple-choice question for the quiz "${quiz.name}".`,
    quiz.description ? `Quiz description: ${quiz.description}` : '',
    `Category: ${quiz.category}. Difficulty: ${quiz.hardness}.`,
    '',
    'Rules:',
    '- "question": the question text.',
    '- "options": an array of exactly 4 plausible answer strings.',
    '- "correctAnswer": the 0-based index (0 to 3) of the correct option.',
    '- "explain": one short sentence explaining why the answer is correct.',
    '- Exactly one option is correct.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
    '- The question must fit the quiz subject and difficulty.',
    '- It must NOT duplicate any of the existing questions listed below.',
    '- Write everything in English. Output only the JSON object, with no extra text.',
    '',
    'Existing questions to avoid duplicating:',
    others || '(none)',
    '',
    `Question being replaced: ${current?.question ?? '(none)'}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildEditPrompt(question: OptionsQuestion, instructions: string): string {
  const options = question.options.map((opt, i) => `  ${i}. ${opt}`).join('\n')
  return [
    'You are editing a single multiple-choice question.',
    'Apply the instructions below to the question and return the updated question as a single JSON object.',
    'Work ONLY with the question provided — do not invent a broader quiz, topic or surrounding context.',
    '',
    `Instructions: ${instructions.trim()}`,
    '',
    'Current question:',
    `- question: ${question.question}`,
    '- options:',
    options,
    `- correctAnswer (0-based index): ${question.correctAnswer}`,
    question.explain ? `- explain: ${question.explain}` : '',
    '',
    'Rules:',
    '- Keep the same JSON shape: "question", "options", "correctAnswer", "explain".',
    '- "options": exactly 4 plausible answer strings.',
    '- "correctAnswer": the 0-based index (0 to 3) of the correct option; exactly one is correct.',
    '- "explain": one short sentence explaining why the answer is correct.',
    '- Preserve anything the instructions do not ask to change.',
    '- Output only the JSON object, with no extra text.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'ai-quiz'
}

function parseOpenRouterError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body)
    const message = parsed?.error?.message
    if (typeof message === 'string' && message.trim()) return message
  } catch {
    // ignore non-JSON error bodies
  }
  if (status === 401 || status === 403) return 'Invalid OpenRouter API key or request rejected.'
  if (status === 429) return 'Rate limit reached. Wait a moment and try again.'
  return `OpenRouter request failed (status ${status}).`
}

function parseGeminiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body)
    const message = parsed?.error?.message
    if (typeof message === 'string' && message.trim()) return message
  } catch {
    // ignore non-JSON error bodies
  }
  if (status === 400 || status === 403) return 'Invalid Gemini API key or request rejected.'
  if (status === 429) return 'Rate limit reached. Wait a moment and try again.'
  return `Gemini request failed (status ${status}).`
}

function normalizeQuestion(item: unknown): OptionsQuestion | null {
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
}

function normalizeQuiz(raw: unknown, fallbackSubject: string): QuizMetadata {
  if (!raw || typeof raw !== 'object') {
    throw new Error('The model did not return a valid quiz object.')
  }
  const data = raw as Record<string, unknown>
  const rawQuestions = Array.isArray(data.questions) ? data.questions : []

  const questions: OptionsQuestion[] = rawQuestions
    .map(normalizeQuestion)
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

export function parseQuizJson(text: string): QuizMetadata {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Paste or upload a quiz JSON first.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Invalid JSON: check for missing commas, quotes or brackets.')
  }
  return normalizeQuiz(parsed, 'imported-quiz')
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

export interface RegeneratedQuestion {
  question: OptionsQuestion
  model: string
}

function parseJsonContent(text: string, provider: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new AiProviderError(`${provider} returned malformed JSON.`, true)
  }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  schema: object,
  temperature: number
): Promise<{ parsed: unknown; model: string }> {
  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://polimind.app',
      'X-Title': 'Polimind',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'quiz_response',
          strict: true,
          schema,
        },
      },
      temperature,
    }),
  })

  if (!response.ok) {
    const retryable = response.status === 404 || response.status === 429 || response.status >= 500
    throw new AiProviderError(parseOpenRouterError(response.status, await response.text()), retryable)
  }

  const payload = await response.json()
  const text = payload?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('OpenRouter returned an empty response.', true)
  }

  return {
    parsed: parseJsonContent(text, 'OpenRouter'),
    model: typeof payload.model === 'string' ? payload.model : model,
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  schema: object,
  temperature: number
): Promise<{ parsed: unknown; model: string }> {
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature,
      },
    }),
  })

  if (!response.ok) {
    const retryable = response.status === 404 || response.status === 429 || response.status >= 500
    throw new AiProviderError(parseGeminiError(response.status, await response.text()), retryable)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('Gemini returned an empty response.', true)
  }

  return {
    parsed: parseJsonContent(text, 'Gemini'),
    model,
  }
}

async function withModelFallback<T>(
  models: string[],
  provider: string,
  run: (model: string) => Promise<{ result: T; model: string }>
): Promise<{ result: T; model: string }> {
  let lastError: Error | null = null

  for (const model of models) {
    try {
      return await run(model)
    } catch (err) {
      if (err instanceof AiProviderError && !err.retryable) throw err
      lastError = err instanceof Error ? err : new Error('Unknown error.')
    }
  }

  throw new Error(
    lastError
      ? `All ${provider} models failed. Last error: ${lastError.message}`
      : `All ${provider} models are unavailable right now. Try again later.`
  )
}

function callProvider(
  settings: AiSettings,
  model: string,
  prompt: string,
  schema: object
): Promise<{ parsed: unknown; model: string }> {
  return settings.provider === 'openrouter'
    ? callOpenRouter(settings.apiKey, model, prompt, schema, settings.temperature)
    : callGemini(settings.apiKey, model, prompt, schema, settings.temperature)
}

function assertApiKey(settings: AiSettings): void {
  if (!settings.apiKey.trim()) {
    throw new Error(`Add your ${providerName(settings.provider)} API key first.`)
  }
}

export async function generateQuiz(
  settings: AiSettings,
  subject: string,
  count: number,
  category: string
): Promise<GeneratedQuiz> {
  assertApiKey(settings)
  const prompt = buildPrompt(subject, count, category)
  const { result, model } = await withModelFallback(
    providerModels(settings.provider),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, RESPONSE_SCHEMA)
      return { result: normalizeQuiz(parsed, subject), model: usedModel }
    }
  )
  return { quiz: { ...result, category }, model }
}

export async function regenerateQuestion(
  settings: AiSettings,
  quiz: QuizMetadata,
  index: number,
  instructions?: string
): Promise<RegeneratedQuestion> {
  assertApiKey(settings)
  const trimmedInstructions = instructions?.trim()
  const current = quiz.questions[index]
  const prompt = trimmedInstructions && current && 'options' in current
    ? buildEditPrompt(current, trimmedInstructions)
    : buildQuestionPrompt(quiz, index)

  const { result, model } = await withModelFallback(
    providerModels(settings.provider),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, QUESTION_SCHEMA)
      const question = normalizeQuestion(parsed)
      if (!question) {
        throw new AiProviderError(`${providerName(settings.provider)} returned an invalid question.`, true)
      }
      return { result: question, model: usedModel }
    }
  )
  return { question: result, model }
}

// ---------------------------------------------------------------------------
// Streaming quiz generation via OpenRouter SSE
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  /** Fires when quiz metadata (name, description, etc.) is first detected. */
  onMeta?: (partial: Partial<QuizMetadata>) => void
  /** Fires each time a new complete question is extracted from the stream. */
  onQuestion?: (question: OptionsQuestion, index: number) => void
  /** Fires when streaming completes with the final validated quiz. */
  onDone?: (result: GeneratedQuiz) => void
  /** Fires on error (streaming or parsing). */
  onError?: (error: Error) => void
}

/**
 * Read an SSE response body line-by-line and yield each `data:` payload.
 * Handles the `data: [DONE]` sentinel from the OpenAI-compatible API.
 */
async function* readSSEStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return
          yield payload
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Extract delta content text from an OpenAI-compatible SSE JSON payload.
 */
function extractDelta(json: string): string {
  try {
    const parsed = JSON.parse(json)
    return parsed?.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}

/**
 * Attempt to extract complete question objects from a growing JSON buffer.
 * Returns an array of newly found questions (those beyond `alreadyFound`).
 */
function extractNewQuestions(
  buffer: string,
  alreadyFound: number
): OptionsQuestion[] {
  const results: OptionsQuestion[] = []

  // Find all balanced {...} objects inside a "questions" array.
  // We look for patterns like: { "question": "...", ... "explain": "..." }
  const questionPattern = /\{\s*"question"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"options"\s*:\s*\[(?:[^\]]*)\]\s*,\s*"correctAnswer"\s*:\s*\d+\s*,\s*"explain"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g
  let match: RegExpExecArray | null
  let count = 0

  while ((match = questionPattern.exec(buffer)) !== null) {
    count++
    if (count <= alreadyFound) continue
    try {
      const parsed = JSON.parse(match[0])
      const normalized = normalizeQuestion(parsed)
      if (normalized) results.push(normalized)
    } catch {
      // Partial/malformed match — skip
    }
  }

  return results
}

/**
 * Attempt to extract quiz metadata fields from a partial JSON buffer.
 */
function extractPartialMeta(buffer: string): Partial<QuizMetadata> | null {
  const meta: Partial<QuizMetadata> = {}
  let found = false

  const nameMatch = buffer.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (nameMatch) { meta.name = nameMatch[1]; found = true }

  const descMatch = buffer.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (descMatch) { meta.description = descMatch[1]; found = true }

  const colorMatch = buffer.match(/"color"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (colorMatch && COLOR_KEYS.includes(colorMatch[1])) {
    meta.color = colorMatch[1]; found = true
  }

  const categoryMatch = buffer.match(/"category"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (categoryMatch) { meta.category = categoryMatch[1]; found = true }

  const idMatch = buffer.match(/"id"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (idMatch) { meta.id = idMatch[1]; found = true }

  return found ? meta : null
}

/**
 * Stream-generate a quiz.
 *
 * With OpenRouter, calls the API with `stream: true`, reads SSE deltas, and
 * incrementally extracts quiz metadata and question objects. With Gemini,
 * runs the non-streaming `generateQuiz` and fires the same callbacks once.
 *
 * @param settings - provider, API key and temperature
 * @param subject - quiz subject
 * @param count - number of questions
 * @param category - quiz category applied to the result
 * @param callbacks - real-time progress callbacks
 * @param signal - optional AbortSignal for cancellation
 * @returns the final GeneratedQuiz (also delivered via onDone callback)
 */
export async function generateQuizStream(
  settings: AiSettings,
  subject: string,
  count: number,
  category: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<GeneratedQuiz> {
  assertApiKey(settings)

  if (settings.provider === 'gemini') {
    try {
      const result = await generateQuiz(settings, subject, count, category)
      if (callbacks.onMeta) {
        callbacks.onMeta({
          id: result.quiz.id,
          name: result.quiz.name,
          description: result.quiz.description,
          color: result.quiz.color,
          category: result.quiz.category,
        })
      }
      const questions = result.quiz.questions as OptionsQuestion[]
      for (let i = 0; i < questions.length; i++) {
        callbacks.onQuestion?.(questions[i], i)
      }
      callbacks.onDone?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error.')
      callbacks.onError?.(error)
      throw error
    }
  }

  // OpenRouter streaming
  let lastStreamError: Error | null = null
  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://polimind.app',
          'X-Title': 'Polimind',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(subject, count, category) }],
          stream: true,
          temperature: settings.temperature,
        }),
        signal,
      })

      if (!response.ok) {
        const retryable = response.status === 404 || response.status === 429 || response.status >= 500
        const errMsg = parseOpenRouterError(response.status, await response.text())
        if (!retryable) throw new Error(errMsg)
        lastStreamError = new Error(errMsg)
        continue
      }

      if (!response.body) {
        throw new Error('OpenRouter returned no response body for streaming.')
      }

      // Read the SSE stream
      let fullBuffer = ''
      let emittedQuestions = 0
      let metaEmitted = false
      let usedModel = model

      for await (const payload of readSSEStream(response.body)) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

        const delta = extractDelta(payload)
        if (!delta) {
          // Check if payload contains the model name
          try {
            const parsed = JSON.parse(payload)
            if (typeof parsed?.model === 'string') usedModel = parsed.model
          } catch { /* ignore */ }
          continue
        }

        fullBuffer += delta

        // Try to extract metadata once
        if (!metaEmitted) {
          const meta = extractPartialMeta(fullBuffer)
          if (meta) {
            metaEmitted = true
            callbacks.onMeta?.(meta)
          }
        }

        // Try to extract new questions
        const newQuestions = extractNewQuestions(fullBuffer, emittedQuestions)
        for (const q of newQuestions) {
          callbacks.onQuestion?.(q, emittedQuestions)
          emittedQuestions++
        }
      }

      // Stream finished — parse the complete buffer for the final quiz
      // Strip any markdown code fences the model may have wrapped around the JSON
      let jsonText = fullBuffer.trim()
      const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) jsonText = fenceMatch[1].trim()

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonText)
      } catch {
        throw new Error('OpenRouter stream produced malformed JSON.')
      }

      const quiz = { ...normalizeQuiz(parsed, subject), category }
      const result: GeneratedQuiz = { quiz, model: usedModel }
      callbacks.onDone?.(result)
      return result

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      lastStreamError = err instanceof Error ? err : new Error('Unknown streaming error.')
    }
  }

  const finalError = new Error(
    lastStreamError
      ? `OpenRouter failed. Last error: ${lastStreamError.message}`
      : 'OpenRouter is unavailable right now. Try again later.'
  )
  callbacks.onError?.(finalError)
  throw finalError
}
