import { QuizMetadata, OptionsQuestion, BoolQuestion, Question, QuizType } from '@/types/quiz'
import type { ClassifyQuizData, ClassifyFacet, ClassifyEntity } from '@/types/quiz'
import type { Glossary, GlossaryGroup } from '@/types/glossary'
import { validateClassifyQuiz } from '@/utils/classify/validate'
import { AVAILABLE_COLORS } from '@/utils/colorMapper'
import { formatSubject } from '@/utils/formatSubject'
import { CATEGORIES, getCategoryById } from '@/data/categories'

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
  /** OpenRouter only: pin a specific model. Empty/undefined means auto-route. */
  model?: string
}

export interface OpenRouterModelOption {
  id: string
  name: string
}

/**
 * Fetch OpenRouter's public model list and keep only the free ones. No API key
 * is needed for this endpoint. Used to populate the "specific model" picker.
 */
export async function fetchOpenRouterFreeModels(): Promise<OpenRouterModelOption[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models')
  if (!response.ok) {
    throw new Error('Could not load OpenRouter models.')
  }
  const payload = await response.json()
  const list = Array.isArray(payload?.data) ? payload.data : []
  const free: OpenRouterModelOption[] = []
  for (const m of list) {
    if (!m || typeof m.id !== 'string') continue
    const pricing = (m.pricing ?? {}) as { prompt?: string; completion?: string }
    const isFree =
      m.id.endsWith(':free') ||
      (parseFloat(pricing.prompt ?? '1') === 0 && parseFloat(pricing.completion ?? '1') === 0)
    if (!isFree) continue
    // Keep only text-in / text-out chat models (drop audio/image generators).
    const outputs = (m.architecture?.output_modalities ?? ['text']) as string[]
    if (!outputs.includes('text') || outputs.includes('audio') || outputs.includes('image')) continue
    free.push({ id: m.id, name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : m.id })
  }
  free.sort((a, b) => a.name.localeCompare(b.name))
  return free
}

export const QUIZ_CATEGORIES = CATEGORIES.map((c) => c.id)

function providerName(provider: AiProvider): string {
  return provider === 'openrouter' ? 'OpenRouter' : 'Gemini'
}

function providerModels(provider: AiProvider): string[] {
  return provider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS
}

/**
 * Models to try for a request. When the user pinned a specific OpenRouter model
 * it's the only one tried; otherwise fall back to the provider's default list.
 */
function settingsModels(settings: AiSettings): string[] {
  const pinned = settings.model?.trim()
  if (settings.provider === 'openrouter' && pinned) return [pinned]
  return providerModels(settings.provider)
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

export type GenType = 'options' | 'bool' | 'classify' | 'glossary'

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

const BOOL_QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    result: { type: 'boolean' },
    explain: { type: 'string' },
  },
  required: ['question', 'result', 'explain'],
}

function itemSchemaFor(type: GenType): object {
  return type === 'bool' ? BOOL_QUESTION_SCHEMA : QUESTION_SCHEMA
}

/** Human-readable noun for the quiz kind, used in prompt phrasing. */
function typeNoun(type: GenType): string {
  return type === 'bool' ? 'true/false quiz' : 'multiple-choice quiz'
}

/** Prompt rules block describing the shape of each question for a given type. */
function questionRules(type: GenType, count: number): string[] {
  if (type === 'bool') {
    return [
      `- "questions": exactly ${count} items. Each item has:`,
      '    - "question": a self-contained factual statement to be judged True or False.',
      '    - "result": boolean — true if the statement is correct, false otherwise.',
      '    - "explain": one short sentence explaining why.',
      '- Balance the number of true and false statements; do not follow a predictable pattern.',
    ]
  }
  return [
    `- "questions": exactly ${count} items. Each item has:`,
    '    - "question": the question text.',
    '    - "options": an array of exactly 4 plausible answer strings.',
    '    - "correctAnswer": the 0-based index (0 to 3) of the correct option.',
    '    - "explain": one short sentence explaining why the answer is correct.',
    '- Exactly one option is correct, and vary the position of the correct answer across questions.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
  ]
}

function subcategoriesFor(category: string): string[] {
  return getCategoryById(category)?.subcategories ?? []
}

function resolveSubcategory(category: string, subcategory?: string): string | undefined {
  const picked = subcategory?.trim()
  return picked && subcategoriesFor(category).includes(picked) ? picked : undefined
}

function allowedSubcategories(category: string, subcategory?: string): string[] {
  const forced = resolveSubcategory(category, subcategory)
  return forced ? [forced] : subcategoriesFor(category)
}

function subcategoryRule(category: string, subcategory?: string): string {
  const forced = resolveSubcategory(category, subcategory)
  if (forced) return `- "subcategory": use exactly "${forced}".`
  const options = subcategoriesFor(category)
  return options.length > 0
    ? `- "subcategory": pick exactly ONE from this list that best fits the subject: ${options.join(', ')}.`
    : ''
}

function buildResponseSchema(subcategories: string[], type: GenType = 'options'): object {
  const properties: Record<string, unknown> = {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string', enum: COLOR_KEYS },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    hardness: { type: 'string', enum: [...HARDNESS_VALUES] },
    questions: {
      type: 'array',
      items: itemSchemaFor(type),
    },
  }
  const required = ['id', 'name', 'description', 'color', 'category', 'tags', 'hardness', 'questions']

  if (subcategories.length > 0) {
    properties.subcategory = { type: 'string', enum: [...subcategories] }
    required.push('subcategory')
  }

  return { type: 'object', properties, required }
}

const STYLE_SAMPLE_PER_QUIZ = 3
const STYLE_SAMPLE_TOTAL = 15

/**
 * Build a "special context" prompt block from existing quizzes. For each quiz
 * it states its subject (name, description, topics) and lists a few of its
 * questions so the model can use them as context for what the new quiz should
 * cover. Returns an empty string when there is nothing to include.
 */
export function buildQuizContext(quizzes: QuizMetadata[]): string {
  const blocks: string[] = []
  let total = 0

  for (const quiz of quizzes) {
    if (total >= STYLE_SAMPLE_TOTAL) break
    const questions = Array.isArray(quiz.questions) ? quiz.questions : []
    const samples: string[] = []
    for (const question of questions) {
      if (samples.length >= STYLE_SAMPLE_PER_QUIZ || total >= STYLE_SAMPLE_TOTAL) break
      if (!question || typeof (question as OptionsQuestion).question !== 'string') continue
      const text = (question as OptionsQuestion).question.trim()
      if (!text) continue
      samples.push(`  - ${text}`)
      total++
    }
    if (samples.length === 0) continue

    const description = quiz.description?.trim()
    const tags = Array.isArray(quiz.tags) ? quiz.tags.filter(Boolean) : []
    const subjectLine = [
      `Reference "${quiz.name}"`,
      description ? `— ${description}` : '',
      tags.length > 0 ? `(topics: ${tags.join(', ')})` : '',
    ]
      .filter(Boolean)
      .join(' ')

    blocks.push([subjectLine, 'Questions:', ...samples].join('\n'))
  }

  if (blocks.length === 0) return ''

  return [
    'Special context — the reference quizzes below (their subjects and questions) are provided as context for what the new quiz should cover.',
    'Use them to understand the topic area and to inform the questions you generate, keeping the new quiz consistent with them while still centered on the Subject defined below.',
    'Do not duplicate the reference questions verbatim; write fresh questions that fit alongside them.',
    '',
    ...blocks.flatMap((block) => [block, '']),
  ]
    .join('\n')
    .trimEnd()
}

function buildPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string,
  type: GenType = 'options'
): string {
  return [
    'You are a quiz generator for "polimind", a learning platform.',
    `Generate one high-quality ${typeNoun(type)} as a single JSON object that follows the exact structure required by the platform.`,
    '',
    'Rules:',
    '- "id": a short lowercase kebab-case slug derived from the subject (only [a-z0-9-], no spaces).',
    '- "name": a concise, human-readable title naming only the content itself. Do NOT include words like "quiz", "fundamentals", "test", "trivia", "challenge" or any equivalent.',
    '- "description": one engaging sentence describing the quiz.',
    `- "color": pick exactly ONE from this list: ${COLOR_KEYS.join(', ')}.`,
    `- "category": use exactly "${category}".`,
    subcategoryRule(category, subcategory),
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": one of ${HARDNESS_VALUES.join(', ')}.`,
    ...questionRules(type, count),
    '- Write everything in English (id too). Output only the JSON object, with no extra text.',
    '',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subject}`,
    `Number of questions: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Item shape lines shown in the copy-prompt example block, per type. */
function copyItemShape(type: GenType): string[] {
  if (type === 'bool') {
    return [
      '    {',
      '      "question": "A self-contained statement to judge as true or false",',
      '      "result": true,',
      '      "explain": "One short sentence on why."',
      '    }',
    ]
  }
  return [
    '    {',
    '      "question": "The question text",',
    '      "options": ["option A", "option B", "option C", "option D"],',
    '      "correctAnswer": 0,',
    '      "explain": "One short sentence on why the answer is correct."',
    '    }',
  ]
}

/** Item-shape rules shown in the copy-prompt rules block, per type. */
function copyItemRules(type: GenType, count: number): string[] {
  if (type === 'bool') {
    return [
      `- "questions": exactly ${count} items, each a statement to judge true or false.`,
      '- "result": boolean — true if the statement is correct, false otherwise.',
      '- Balance true and false statements; avoid a predictable pattern.',
    ]
  }
  return [
    `- "questions": exactly ${count} items, each with exactly 4 plausible options.`,
    '- "correctAnswer": 0-based index (0 to 3) of the correct option; exactly one option is correct.',
    '- Vary the position of the correct answer across questions.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
  ]
}

export function buildCopyPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string,
  type: GenType = 'options'
): string {
  const subjectLine = subject.trim() || '<describe your subject here>'
  const subcategories = allowedSubcategories(category, subcategory)
  return [
    'You are a quiz generator for "polimind", a learning platform.',
    `Create one high-quality ${typeNoun(type)} about the subject below and return it as a SINGLE JSON object — no markdown, no code fences, no comments, no extra text.`,
    '',
    'Output EXACTLY this shape:',
    '{',
    '  "id": "kebab-case-slug",',
    '  "name": "Concise human-readable title",',
    '  "description": "One engaging sentence describing the quiz.",',
    `  "color": "one of: ${COLOR_KEYS.join(', ')}",`,
    `  "category": "${category}",`,
    subcategories.length > 0 ? `  "subcategory": "one of: ${subcategories.join(', ')}",` : '',
    '  "tags": ["two", "to", "four", "keywords"],',
    `  "hardness": "one of: ${HARDNESS_VALUES.join(', ')}",`,
    `  "type": "${type}",`,
    '  "questions": [',
    ...copyItemShape(type),
    '  ]',
    '}',
    '',
    'Rules:',
    '- "id": lowercase kebab-case slug from the subject, only [a-z0-9-], no spaces.',
    `- "color": pick exactly ONE from: ${COLOR_KEYS.join(', ')}.`,
    subcategoryRule(category, subcategory),
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": exactly one of ${HARDNESS_VALUES.join(', ')}.`,
    `- "type": keep it as "${type}".`,
    ...copyItemRules(type, count),
    '- "name": name only the content itself. Do NOT put words like "quiz", "fundamentals", "test", "trivia", "challenge" or any equivalent in the title.',
    '- Write everything in English (including "id"). Output ONLY the JSON object.',
    '',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subjectLine}`,
    `Number of questions: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Single-item shape rules for regenerate/edit prompts, per type. */
function singleItemRules(type: GenType): string[] {
  if (type === 'bool') {
    return [
      '- "question": a self-contained statement to judge True or False.',
      '- "result": boolean — true if the statement is correct, false otherwise.',
      '- "explain": one short sentence explaining why.',
    ]
  }
  return [
    '- "question": the question text.',
    '- "options": an array of exactly 4 plausible answer strings.',
    '- "correctAnswer": the 0-based index (0 to 3) of the correct option.',
    '- "explain": one short sentence explaining why the answer is correct.',
    '- Exactly one option is correct.',
    '- Do NOT make the correct option the longest one; keep all options similar in length so length is not a clue.',
  ]
}

function buildQuestionPrompt(quiz: QuizMetadata, index: number): string {
  const type: GenType = quiz.type === 'bool' ? 'bool' : 'options'
  const current = quiz.questions[index]
  const others = quiz.questions
    .filter((_, i) => i !== index)
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n')

  return [
    'You are a quiz generator for "polimind", a learning platform.',
    `Generate exactly ONE new ${type === 'bool' ? 'true/false statement' : 'multiple-choice question'} for the quiz "${quiz.name}".`,
    quiz.description ? `Quiz description: ${quiz.description}` : '',
    `Category: ${quiz.category}. Difficulty: ${quiz.hardness}.`,
    '',
    'Rules:',
    ...singleItemRules(type),
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

function buildEditPrompt(question: Question, instructions: string, type: GenType): string {
  const currentBlock =
    type === 'bool' && 'result' in question
      ? [`- result (true/false): ${question.result}`]
      : 'options' in question
        ? [
            '- options:',
            question.options.map((opt, i) => `  ${i}. ${opt}`).join('\n'),
            `- correctAnswer (0-based index): ${question.correctAnswer}`,
          ]
        : []
  return [
    `You are editing a single ${type === 'bool' ? 'true/false statement' : 'multiple-choice question'}.`,
    'Apply the instructions below to the question and return the updated question as a single JSON object.',
    'Work ONLY with the question provided — do not invent a broader quiz, topic or surrounding context.',
    '',
    `Instructions: ${instructions.trim()}`,
    '',
    'Current question:',
    `- question: ${question.question}`,
    ...currentBlock,
    question.explain ? `- explain: ${question.explain}` : '',
    '',
    'Rules:',
    ...singleItemRules(type),
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

function normalizeBoolQuestion(item: unknown): BoolQuestion | null {
  if (!item || typeof item !== 'object') return null
  const q = item as Record<string, unknown>
  if (typeof q.question !== 'string' || !q.question.trim()) return null
  if (typeof q.result !== 'boolean') return null
  const question: BoolQuestion = { question: q.question.trim(), result: q.result }
  if (typeof q.explain === 'string' && q.explain.trim()) {
    question.explain = q.explain.trim()
  }
  return question
}

function resolveGenType(data: Record<string, unknown>, forced?: GenType): QuizType {
  if (forced === 'bool' || forced === 'classify' || forced === 'options') return forced
  const t = data.type
  return t === 'bool' || t === 'classify' ? t : 'options'
}

function normalizeQuiz(
  raw: unknown,
  fallbackSubject: string,
  forcedType?: GenType
): QuizMetadata {
  if (!raw || typeof raw !== 'object') {
    throw new Error('The model did not return a valid quiz object.')
  }
  const data = raw as Record<string, unknown>
  const type = resolveGenType(data, forcedType)
  const rawQuestions = Array.isArray(data.questions) ? data.questions : []

  let questions: Question[]
  if (type === 'bool') {
    const mapped = rawQuestions.map(normalizeBoolQuestion)
    if (mapped.length === 0 || mapped.some((q) => q === null)) {
      throw new Error(
        'The generated true/false quiz was inconsistent. Please generate again.'
      )
    }
    questions = mapped as BoolQuestion[]
  } else {
    questions = rawQuestions
      .map(normalizeQuestion)
      .filter((q): q is OptionsQuestion => q !== null)
    if (questions.length === 0) {
      throw new Error('The generated quiz had no valid questions.')
    }
  }

  const id = slugify((typeof data.id === 'string' && data.id) || (typeof data.name === 'string' && data.name) || fallbackSubject)
  const color = typeof data.color === 'string' && COLOR_KEYS.includes(data.color) ? data.color : 'purple'
  const hardness = HARDNESS_VALUES.includes(data.hardness as (typeof HARDNESS_VALUES)[number])
    ? (data.hardness as (typeof HARDNESS_VALUES)[number])
    : 'medium'
  const category = typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'general'
  const validSubcategories = subcategoriesFor(category)
  const subcategory =
    typeof data.subcategory === 'string' && validSubcategories.includes(data.subcategory.trim())
      ? data.subcategory.trim()
      : undefined

  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : formatSubject(id),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    icon: typeof data.icon === 'string' ? data.icon : '',
    color,
    category,
    ...(subcategory ? { subcategory } : {}),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    hardness,
    type,
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
  if (quiz.type === 'classify') {
    return {
      id: quiz.id,
      name: quiz.name,
      description: quiz.description,
      ...(quiz.icon ? { icon: quiz.icon } : {}),
      color: quiz.color,
      category: quiz.category,
      ...(quiz.subcategory ? { subcategory: quiz.subcategory } : {}),
      tags: quiz.tags,
      hardness: quiz.hardness,
      type: quiz.type,
      ...(quiz.config ? { config: quiz.config } : {}),
      facets: quiz.facets ?? [],
      entities: quiz.entities ?? [],
    }
  }
  return {
    id: quiz.id,
    name: quiz.name,
    description: quiz.description,
    ...(quiz.icon ? { icon: quiz.icon } : {}),
    color: quiz.color,
    category: quiz.category,
    ...(quiz.subcategory ? { subcategory: quiz.subcategory } : {}),
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
  question: Question
  model: string
}

function parseJsonContent(text: string, provider: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Weaker models often wrap the JSON in ```json fences or add stray prose.
    // Strip fences and retry on the outermost {...} object before giving up.
    const stripped = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1))
      } catch {
        // fall through to the error below
      }
    }
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
  category: string,
  subcategory?: string,
  styleContext?: string,
  type: GenType = 'options'
): Promise<GeneratedQuiz> {
  assertApiKey(settings)
  const forcedSubcategory = resolveSubcategory(category, subcategory)
  const prompt = buildPrompt(subject, count, category, forcedSubcategory, styleContext, type)
  const schema = buildResponseSchema(allowedSubcategories(category, forcedSubcategory), type)
  const { result, model } = await withModelFallback(
    settingsModels(settings),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, schema)
      return { result: normalizeQuiz(parsed, subject, type), model: usedModel }
    }
  )
  return {
    quiz: { ...result, category, ...(forcedSubcategory ? { subcategory: forcedSubcategory } : {}) },
    model,
  }
}

// ---------------------------------------------------------------------------
// Glossary generation
// ---------------------------------------------------------------------------

export interface GeneratedGlossary {
  glossary: Glossary
  model: string
}

function buildGlossarySchema(subcategories: string[]): object {
  const properties: Record<string, unknown> = {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string', enum: COLOR_KEYS },
    category: { type: 'string' },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          groupName: { type: 'string' },
          group: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                term: { type: 'string' },
                definition: { type: 'string' },
              },
              required: ['term', 'definition'],
            },
          },
        },
        required: ['groupName', 'group'],
      },
    },
  }
  const required = ['id', 'name', 'description', 'color', 'category', 'groups']
  if (subcategories.length > 0) {
    properties.subcategory = { type: 'string', enum: [...subcategories] }
    required.push('subcategory')
  }
  return { type: 'object', properties, required }
}

function buildGlossaryPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): string {
  return [
    'You are a glossary generator for "polimind", a learning platform.',
    'Generate one high-quality glossary as a single JSON object that follows the exact structure required by the platform.',
    '',
    'Rules:',
    '- "id": a short lowercase kebab-case slug derived from the subject (only [a-z0-9-], no spaces).',
    '- "name": a concise, human-readable title naming only the content itself. Do NOT include words like "glossary", "terms", "dictionary" or any equivalent.',
    '- "description": one engaging sentence describing the glossary.',
    `- "color": pick exactly ONE from this list: ${COLOR_KEYS.join(', ')}.`,
    `- "category": use exactly "${category}".`,
    subcategoryRule(category, subcategory),
    `- "groups": organize the terms into 1 to 4 thematic groups. Together the groups must contain about ${count} terms total.`,
    '    - "groupName": a short title for the group (use an empty string "" if there is only one ungrouped set).',
    '    - "group": an array of items, each with:',
    '        - "term": the term or concept name.',
    '        - "definition": a clear, self-contained one to two sentence definition.',
    '- Do NOT repeat terms. Keep definitions accurate and concise.',
    '- Write everything in English (id too). Output only the JSON object, with no extra text.',
    '',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subject}`,
    `Approximate number of terms: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildGlossaryCopyPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): string {
  const subjectLine = subject.trim() || '<describe your subject here>'
  const subcategories = allowedSubcategories(category, subcategory)
  return [
    'You are a glossary generator for "polimind", a learning platform.',
    'Create one high-quality glossary about the subject below and return it as a SINGLE JSON object — no markdown, no code fences, no comments, no extra text.',
    '',
    'Output EXACTLY this shape:',
    '{',
    '  "id": "kebab-case-slug",',
    '  "name": "Concise human-readable title",',
    '  "description": "One engaging sentence describing the glossary.",',
    `  "color": "one of: ${COLOR_KEYS.join(', ')}",`,
    `  "category": "${category}",`,
    subcategories.length > 0 ? `  "subcategory": "one of: ${subcategories.join(', ')}",` : '',
    '  "terms": [',
    '    {',
    '      "groupName": "Optional group title or empty string",',
    '      "group": [',
    '        { "term": "The term", "definition": "A clear one to two sentence definition." }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- "id": lowercase kebab-case slug from the subject, only [a-z0-9-], no spaces.',
    `- "color": pick exactly ONE from: ${COLOR_KEYS.join(', ')}.`,
    subcategoryRule(category, subcategory),
    `- "terms": 1 to 4 groups containing about ${count} terms total; each item has "term" and "definition".`,
    '- Do NOT repeat terms; keep definitions accurate and concise.',
    '- "name": name only the content itself. Do NOT put words like "glossary", "terms" or "dictionary" in the title.',
    '- Write everything in English (including "id"). Output ONLY the JSON object.',
    '',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subjectLine}`,
    `Approximate number of terms: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function normalizeGlossaryGroups(raw: unknown): GlossaryGroup[] {
  if (!Array.isArray(raw)) return []
  const groups: GlossaryGroup[] = []
  for (const entry of raw) {
    if (!entry || !Array.isArray((entry as { group?: unknown }).group)) continue
    const e = entry as { groupName?: unknown; group: unknown[] }
    const terms = e.group
      .filter(
        (t): t is { term: string; definition?: unknown } =>
          !!t && typeof (t as { term?: unknown }).term === 'string' && (t as { term: string }).term.trim() !== ''
      )
      .map((t) => ({
        term: (t.term as string).trim(),
        definition: typeof t.definition === 'string' ? t.definition.trim() : '',
      }))
    if (terms.length === 0) continue
    const name = typeof e.groupName === 'string' && e.groupName.trim() ? e.groupName.trim() : null
    groups.push({ groupName: name, group: terms })
  }
  return groups
}

function normalizeGlossary(raw: unknown, fallbackSubject: string): Glossary {
  if (!raw || typeof raw !== 'object') {
    throw new Error('The model did not return a valid glossary object.')
  }
  const data = raw as Record<string, unknown>
  const groups = normalizeGlossaryGroups(data.groups ?? data.terms)
  if (groups.length === 0 || groups.every((g) => g.group.length === 0)) {
    throw new Error('The generated glossary had no valid terms. Please generate again.')
  }
  const id = slugify((typeof data.id === 'string' && data.id) || (typeof data.name === 'string' && data.name) || fallbackSubject)
  const color = typeof data.color === 'string' && COLOR_KEYS.includes(data.color) ? data.color : 'purple'
  const category = typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'general'
  const validSubcategories = subcategoriesFor(category)
  const subcategory =
    typeof data.subcategory === 'string' && validSubcategories.includes(data.subcategory.trim())
      ? data.subcategory.trim()
      : undefined
  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : formatSubject(id),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    icon: typeof data.icon === 'string' ? data.icon : '',
    color,
    category,
    ...(subcategory ? { subcategory } : {}),
    groups,
  }
}

export function parseGlossaryJson(text: string): Glossary {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Paste or upload a glossary JSON first.')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Invalid JSON: check for missing commas, quotes or brackets.')
  }
  return normalizeGlossary(parsed, 'imported-glossary')
}

export async function generateGlossary(
  settings: AiSettings,
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): Promise<GeneratedGlossary> {
  assertApiKey(settings)
  const forcedSubcategory = resolveSubcategory(category, subcategory)
  const prompt = buildGlossaryPrompt(subject, count, category, forcedSubcategory, styleContext)
  const schema = buildGlossarySchema(allowedSubcategories(category, forcedSubcategory))
  const { result, model } = await withModelFallback(
    settingsModels(settings),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, schema)
      return { result: normalizeGlossary(parsed, subject), model: usedModel }
    }
  )
  return {
    glossary: { ...result, category, ...(forcedSubcategory ? { subcategory: forcedSubcategory } : {}) },
    model,
  }
}

// ---------------------------------------------------------------------------
// Classify generation
// ---------------------------------------------------------------------------

/** AI returns answers as an array (schema-friendly); we fold it into a map. */
interface RawClassifyAnswer {
  facet: string
  group: string
  explain?: string
}

function classifyEntitySchema(): object {
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      entity: { type: 'string' },
      subtitle: { type: 'string' },
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            facet: { type: 'string' },
            group: { type: 'string' },
            explain: { type: 'string' },
          },
          required: ['facet', 'group', 'explain'],
        },
      },
    },
    required: ['id', 'entity', 'subtitle', 'answers'],
  }
}

function buildClassifySchema(subcategories: string[]): object {
  const properties: Record<string, unknown> = {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string', enum: COLOR_KEYS },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    hardness: { type: 'string', enum: [...HARDNESS_VALUES] },
    facets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          prompt: { type: 'string' },
          groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                hint: { type: 'string' },
              },
              required: ['id', 'label', 'hint'],
            },
          },
        },
        required: ['id', 'label', 'prompt', 'groups'],
      },
    },
    entities: { type: 'array', items: classifyEntitySchema() },
  }
  const required = ['id', 'name', 'description', 'color', 'category', 'tags', 'hardness', 'facets', 'entities']
  if (subcategories.length > 0) {
    properties.subcategory = { type: 'string', enum: [...subcategories] }
    required.push('subcategory')
  }
  return { type: 'object', properties, required }
}

function classifyRules(count: number): string[] {
  return [
    '- "facets": 2 to 3 classification dimensions. Each facet has:',
    '    - "id": a short lowercase kebab-case identifier (e.g. "category", "era").',
    '    - "label": a short human-readable name for the dimension.',
    '    - "prompt": a question containing the placeholder {entity} (e.g. "Which era does {entity} belong to?").',
    '    - "groups": 3 to 5 possible values. Each group has "id" (kebab-case), "label", and "hint" (a very short clue, or "" if none).',
    '    - Do NOT nest facets or reference other facets; keep every facet independent.',
    `- "entities": exactly ${count} items. Each entity has:`,
    '    - "id": a short lowercase kebab-case identifier.',
    '    - "entity": the name of the thing being classified.',
    '    - "subtitle": a short contextual note, or "" if none.',
    '    - "answers": an array with EXACTLY ONE entry per facet. Each entry has "facet" (a facet id), "group" (one of that facet\'s group ids), and "explain" (one short sentence).',
    '- Every entity must answer every facet, and each "group" must be a real group id of the referenced facet.',
  ]
}

/**
 * A complete, valid example in the exact generation output shape (answers as an
 * array, single-level facets). Modeled on the repo's classify data
 * (dino-classification / ml-learning-paradigms) to steer weaker models.
 */
const CLASSIFY_FEWSHOT = `{
  "id": "dinosaur-groups",
  "name": "Dinosaur Groups",
  "description": "Sort each dinosaur by its order and its diet.",
  "color": "amber",
  "category": "sciences",
  "tags": ["biology", "dinosaurs", "taxonomy"],
  "hardness": "medium",
  "facets": [
    {
      "id": "order",
      "label": "Order",
      "prompt": "Which order does {entity} belong to?",
      "groups": [
        { "id": "saurischia", "label": "Saurischia", "hint": "Lizard-hipped" },
        { "id": "ornithischia", "label": "Ornithischia", "hint": "Bird-hipped" },
        { "id": "pterosauria", "label": "Pterosauria", "hint": "Flying, not a dinosaur" }
      ]
    },
    {
      "id": "diet",
      "label": "Diet",
      "prompt": "What did {entity} primarily eat?",
      "groups": [
        { "id": "carnivore", "label": "Carnivore", "hint": "Ate meat" },
        { "id": "herbivore", "label": "Herbivore", "hint": "Ate plants" },
        { "id": "omnivore", "label": "Omnivore", "hint": "Ate both" }
      ]
    }
  ],
  "entities": [
    {
      "id": "trex",
      "entity": "Tyrannosaurus rex",
      "subtitle": "Late Cretaceous",
      "answers": [
        { "facet": "order", "group": "saurischia", "explain": "Theropods like T. rex are lizard-hipped saurischians." },
        { "facet": "diet", "group": "carnivore", "explain": "T. rex was an apex predator that hunted large prey." }
      ]
    },
    {
      "id": "triceratops",
      "entity": "Triceratops",
      "subtitle": "",
      "answers": [
        { "facet": "order", "group": "ornithischia", "explain": "Horned dinosaurs are bird-hipped ornithischians." },
        { "facet": "diet", "group": "herbivore", "explain": "Triceratops used its beak to crop low plants." }
      ]
    }
  ]
}`

function buildClassifyPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): string {
  return [
    'You are a classification-quiz generator for "polimind", a learning platform.',
    'Generate one high-quality "classify" quiz as a single JSON object that follows the exact structure required by the platform.',
    '',
    'Rules:',
    '- "id": a short lowercase kebab-case slug derived from the subject (only [a-z0-9-], no spaces).',
    '- "name": a concise, human-readable title naming only the content itself. Do NOT include words like "quiz", "classify", "test" or any equivalent.',
    '- "description": one engaging sentence describing the quiz.',
    `- "color": pick exactly ONE from this list: ${COLOR_KEYS.join(', ')}.`,
    `- "category": use exactly "${category}".`,
    subcategoryRule(category, subcategory),
    '- "tags": 2 to 4 lowercase keywords.',
    `- "hardness": one of ${HARDNESS_VALUES.join(', ')}.`,
    ...classifyRules(count),
    '- Write everything in English (ids too). Output only the JSON object, with no extra text.',
    '',
    'Follow this EXACT structure. Here is a complete valid example for a different subject (note that "answers" is an array, and every "id" is lowercase kebab-case):',
    CLASSIFY_FEWSHOT,
    '',
    'Now produce a new one for the Subject below with the same structure. Do not copy the example content.',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subject}`,
    `Number of entities: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildClassifyCopyPrompt(
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): string {
  const subjectLine = subject.trim() || '<describe your subject here>'
  const subcategories = allowedSubcategories(category, subcategory)
  return [
    'You are a classification-quiz generator for "polimind", a learning platform.',
    'Create one high-quality "classify" quiz about the subject below and return it as a SINGLE JSON object — no markdown, no code fences, no comments, no extra text.',
    '',
    'Output EXACTLY this shape:',
    '{',
    '  "id": "kebab-case-slug",',
    '  "name": "Concise human-readable title",',
    '  "description": "One engaging sentence describing the quiz.",',
    `  "color": "one of: ${COLOR_KEYS.join(', ')}",`,
    `  "category": "${category}",`,
    subcategories.length > 0 ? `  "subcategory": "one of: ${subcategories.join(', ')}",` : '',
    '  "tags": ["two", "to", "four", "keywords"],',
    `  "hardness": "one of: ${HARDNESS_VALUES.join(', ')}",`,
    '  "type": "classify",',
    '  "config": { "mode": "sequential", "optionCount": 4, "shuffleEntities": true },',
    '  "facets": [',
    '    { "id": "facet-id", "label": "Facet name", "prompt": "Which ... does {entity} belong to?",',
    '      "groups": [ { "id": "group-id", "label": "Group name", "hint": "short clue" } ] }',
    '  ],',
    '  "entities": [',
    '    { "id": "entity-id", "entity": "Name", "subtitle": "optional",',
    '      "answers": { "facet-id": "group-id" },',
    '      "explain": { "facet-id": "One short sentence." } }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- "id": lowercase kebab-case slug from the subject, only [a-z0-9-], no spaces.',
    `- "color": pick exactly ONE from: ${COLOR_KEYS.join(', ')}.`,
    subcategoryRule(category, subcategory),
    '- "facets": 2 to 3 independent dimensions, each with 3 to 5 groups; do NOT nest facets.',
    `- "entities": exactly ${count} items; each "answers" maps every facet id to one of that facet\'s group ids.`,
    '- Every group id referenced in "answers" must exist in the matching facet.',
    '- Write everything in English (including ids). Output ONLY the JSON object.',
    '',
    styleContext ? `${styleContext}\n` : '',
    `Subject: ${subjectLine}`,
    `Number of entities: ${count}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function normalizeClassifyFacets(raw: unknown): ClassifyFacet[] {
  if (!Array.isArray(raw)) return []
  const facets: ClassifyFacet[] = []
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue
    const facet = f as Record<string, unknown>
    if (typeof facet.id !== 'string' || !facet.id.trim()) continue
    const groups = Array.isArray(facet.groups)
      ? facet.groups
          .filter((g): g is Record<string, unknown> => !!g && typeof (g as { id?: unknown }).id === 'string')
          .map((g) => ({
            id: String(g.id).trim(),
            label: typeof g.label === 'string' && g.label.trim() ? g.label.trim() : String(g.id).trim(),
            ...(typeof g.hint === 'string' && g.hint.trim() ? { hint: g.hint.trim() } : {}),
          }))
      : []
    facets.push({
      id: facet.id.trim(),
      label: typeof facet.label === 'string' && facet.label.trim() ? facet.label.trim() : facet.id.trim(),
      prompt:
        typeof facet.prompt === 'string' && facet.prompt.includes('{entity}')
          ? facet.prompt.trim()
          : `Which ${typeof facet.label === 'string' ? facet.label.toLowerCase() : 'group'} does {entity} belong to?`,
      groups,
    })
  }
  return facets
}

function normalizeClassifyEntities(raw: unknown): ClassifyEntity[] {
  if (!Array.isArray(raw)) return []
  const entities: ClassifyEntity[] = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const ent = e as Record<string, unknown>
    if (typeof ent.id !== 'string' || typeof ent.entity !== 'string') continue
    const answers: Record<string, string> = {}
    const explain: Record<string, string> = {}
    const rawAnswers = ent.answers
    if (Array.isArray(rawAnswers)) {
      for (const a of rawAnswers as RawClassifyAnswer[]) {
        if (a && typeof a.facet === 'string' && typeof a.group === 'string') {
          answers[a.facet] = a.group
          if (typeof a.explain === 'string' && a.explain.trim()) explain[a.facet] = a.explain.trim()
        }
      }
    } else if (rawAnswers && typeof rawAnswers === 'object') {
      for (const [k, v] of Object.entries(rawAnswers as Record<string, unknown>)) {
        if (typeof v === 'string') answers[k] = v
      }
      const rawExplain = ent.explain
      if (rawExplain && typeof rawExplain === 'object') {
        for (const [k, v] of Object.entries(rawExplain as Record<string, unknown>)) {
          if (typeof v === 'string' && v.trim()) explain[k] = v.trim()
        }
      }
    }
    entities.push({
      id: ent.id.trim(),
      entity: ent.entity.trim(),
      ...(typeof ent.subtitle === 'string' && ent.subtitle.trim() ? { subtitle: ent.subtitle.trim() } : {}),
      answers,
      ...(Object.keys(explain).length > 0 ? { explain } : {}),
    })
  }
  return entities
}

function normalizeClassify(raw: unknown, fallbackSubject: string): QuizMetadata {
  if (!raw || typeof raw !== 'object') {
    throw new Error('The model did not return a valid classify quiz object.')
  }
  const data = raw as Record<string, unknown>
  const facets = normalizeClassifyFacets(data.facets)
  const entities = normalizeClassifyEntities(data.entities)
  const id = slugify((typeof data.id === 'string' && data.id) || (typeof data.name === 'string' && data.name) || fallbackSubject)

  const classifyData: ClassifyQuizData = {
    id,
    config: { mode: 'sequential', optionCount: 4, shuffleEntities: true },
    facets,
    entities,
  }
  // Throws "[classify] ..." on any structural inconsistency (reject + regenerate).
  validateClassifyQuiz(classifyData)

  const color = typeof data.color === 'string' && COLOR_KEYS.includes(data.color) ? data.color : 'purple'
  const hardness = HARDNESS_VALUES.includes(data.hardness as (typeof HARDNESS_VALUES)[number])
    ? (data.hardness as (typeof HARDNESS_VALUES)[number])
    : 'medium'
  const category = typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'general'
  const validSubcategories = subcategoriesFor(category)
  const subcategory =
    typeof data.subcategory === 'string' && validSubcategories.includes(data.subcategory.trim())
      ? data.subcategory.trim()
      : undefined

  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : formatSubject(id),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    icon: typeof data.icon === 'string' ? data.icon : '',
    color,
    category,
    ...(subcategory ? { subcategory } : {}),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    hardness,
    type: 'classify',
    config: classifyData.config,
    facets,
    entities,
    questions: [],
  }
}

export async function generateClassify(
  settings: AiSettings,
  subject: string,
  count: number,
  category: string,
  subcategory?: string,
  styleContext?: string
): Promise<GeneratedQuiz> {
  assertApiKey(settings)
  const forcedSubcategory = resolveSubcategory(category, subcategory)
  const prompt = buildClassifyPrompt(subject, count, category, forcedSubcategory, styleContext)
  const schema = buildClassifySchema(allowedSubcategories(category, forcedSubcategory))
  const { result, model } = await withModelFallback(
    settingsModels(settings),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, schema)
      return { result: normalizeClassify(parsed, subject), model: usedModel }
    }
  )
  return {
    quiz: { ...result, category, ...(forcedSubcategory ? { subcategory: forcedSubcategory } : {}) },
    model,
  }
}

/** Re-classify a single entity: the AI picks the correct group for each facet. */
export async function regenerateClassifyEntity(
  settings: AiSettings,
  quiz: QuizMetadata,
  entityIndex: number
): Promise<ClassifyEntity> {
  assertApiKey(settings)
  const facets = quiz.facets ?? []
  const entity = quiz.entities?.[entityIndex]
  if (!entity) throw new Error('Entity not found.')

  const facetBlocks = facets
    .map(
      (f) =>
        `- Facet "${f.id}" (${f.label}); choose one group id from: ${f.groups
          .map((g) => `${g.id} (${g.label})`)
          .join(', ')}`
    )
    .join('\n')

  const prompt = [
    'You are classifying a single entity for a "classify" quiz on "polimind".',
    `Entity: ${entity.entity}${entity.subtitle ? ` — ${entity.subtitle}` : ''}`,
    '',
    'For each facet below, pick the single correct group id and give a one-sentence explanation.',
    facetBlocks,
    '',
    'Return a JSON object with an "answers" array; each entry has "facet" (the facet id), "group" (the chosen group id) and "explain" (one short sentence). Output only the JSON object.',
  ].join('\n')

  const schema = {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            facet: { type: 'string' },
            group: { type: 'string' },
            explain: { type: 'string' },
          },
          required: ['facet', 'group', 'explain'],
        },
      },
    },
    required: ['answers'],
  }

  const { result } = await withModelFallback(
    settingsModels(settings),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, schema)
      const answers: Record<string, string> = {}
      const explain: Record<string, string> = {}
      const rawAnswers = (parsed as { answers?: unknown })?.answers
      if (Array.isArray(rawAnswers)) {
        for (const a of rawAnswers as RawClassifyAnswer[]) {
          if (!a || typeof a.facet !== 'string' || typeof a.group !== 'string') continue
          const facet = facets.find((f) => f.id === a.facet)
          if (!facet || !facet.groups.some((g) => g.id === a.group)) continue
          answers[a.facet] = a.group
          if (typeof a.explain === 'string' && a.explain.trim()) explain[a.facet] = a.explain.trim()
        }
      }
      if (facets.some((f) => !(f.id in answers))) {
        throw new AiProviderError(`${providerName(settings.provider)} returned an incomplete classification.`, true)
      }
      const updated: ClassifyEntity = {
        ...entity,
        answers,
        ...(Object.keys(explain).length > 0 ? { explain } : {}),
      }
      return { result: updated, model: usedModel }
    }
  )
  return result
}

export async function regenerateQuestion(
  settings: AiSettings,
  quiz: QuizMetadata,
  index: number,
  instructions?: string
): Promise<RegeneratedQuestion> {
  assertApiKey(settings)
  const type: GenType = quiz.type === 'bool' ? 'bool' : 'options'
  const trimmedInstructions = instructions?.trim()
  const current = quiz.questions[index]
  const prompt = trimmedInstructions && current
    ? buildEditPrompt(current, trimmedInstructions, type)
    : buildQuestionPrompt(quiz, index)
  const schema = itemSchemaFor(type)
  const normalize = type === 'bool' ? normalizeBoolQuestion : normalizeQuestion

  const { result, model } = await withModelFallback(
    settingsModels(settings),
    providerName(settings.provider),
    async (m) => {
      const { parsed, model: usedModel } = await callProvider(settings, m, prompt, schema)
      const question = normalize(parsed)
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
  onQuestion?: (question: Question, index: number) => void
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

  const subcategoryMatch = buffer.match(/"subcategory"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (subcategoryMatch) { meta.subcategory = subcategoryMatch[1]; found = true }

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
 * @param subcategory - optional subcategory pinned on the result (empty means the model picks)
 * @param callbacks - real-time progress callbacks
 * @param signal - optional AbortSignal for cancellation
 * @returns the final GeneratedQuiz (also delivered via onDone callback)
 */
export async function generateQuizStream(
  settings: AiSettings,
  subject: string,
  count: number,
  category: string,
  subcategory: string | undefined,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  styleContext?: string,
  type: GenType = 'options'
): Promise<GeneratedQuiz> {
  assertApiKey(settings)
  const forcedSubcategory = resolveSubcategory(category, subcategory)

  // Only options is streamed incrementally; other types (and Gemini) are
  // generated whole and replayed through the same callbacks once.
  if (settings.provider === 'gemini' || type !== 'options') {
    try {
      const result = await generateQuiz(settings, subject, count, category, forcedSubcategory, styleContext, type)
      if (callbacks.onMeta) {
        callbacks.onMeta({
          id: result.quiz.id,
          name: result.quiz.name,
          description: result.quiz.description,
          color: result.quiz.color,
          category: result.quiz.category,
          subcategory: result.quiz.subcategory,
        })
      }
      const questions = result.quiz.questions as Question[]
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
  for (const model of settingsModels(settings)) {
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
          messages: [
            { role: 'user', content: buildPrompt(subject, count, category, forcedSubcategory, styleContext) },
          ],
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

      const quiz = {
        ...normalizeQuiz(parsed, subject),
        category,
        ...(forcedSubcategory ? { subcategory: forcedSubcategory } : {}),
      }
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
