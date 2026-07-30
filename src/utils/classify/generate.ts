import {
  ClassifyFacet,
  ClassifyGroup,
  ClassifyQuestion,
  ClassifyQuizData,
} from '@/types/quiz'
import { validateClassifyQuiz } from './validate'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pick<T>(items: T[], count: number, rand: () => number): T[] {
  if (count <= 0) return []
  return shuffled(items, rand).slice(0, count)
}

export function sampleOptions(
  facet: ClassifyFacet,
  correctGroupId: string,
  optionCount: number,
  rand: () => number
): ClassifyGroup[] {
  const correct = facet.groups.find((g) => g.id === correctGroupId)
  if (!correct) {
    throw new Error(
      `[classify] facet "${facet.id}" has no group "${correctGroupId}"`
    )
  }

  const count = Math.min(Math.max(optionCount, 2), facet.groups.length)
  const need = count - 1
  const others = facet.groups.filter((g) => g.id !== correctGroupId)

  let distractors: ClassifyGroup[]
  if (facet.parent) {
    const siblings = others.filter((g) => g.parentGroup === correct.parentGroup)
    const nonSiblings = others.filter((g) => g.parentGroup !== correct.parentGroup)
    const sibs = pick(siblings, Math.min(2, need), rand)
    const fill = pick(nonSiblings, need - sibs.length, rand)
    distractors = [...sibs, ...fill]
    if (distractors.length < need) {
      const used = new Set(distractors.map((g) => g.id))
      const rest = others.filter((g) => !used.has(g.id))
      distractors = [...distractors, ...pick(rest, need - distractors.length, rand)]
    }
  } else {
    distractors = pick(others, need, rand)
  }

  return shuffled([correct, ...distractors], rand)
}

export function generateClassifyQuestions(
  quiz: ClassifyQuizData,
  seed: number
): ClassifyQuestion[] {
  validateClassifyQuiz(quiz)

  const config = quiz.config ?? {}
  const mode = config.mode === 'sequential' ? 'sequential' : 'single'
  const optionCount = config.optionCount ?? 4
  const shuffleEntities = config.shuffleEntities !== false

  const entities = shuffleEntities
    ? shuffled(quiz.entities, mulberry32(hashString(`${seed}:entities`)))
    : quiz.entities

  const questions: ClassifyQuestion[] = []
  for (const entity of entities) {
    const answered = quiz.facets.filter((f) => f.id in entity.answers)
    const facets =
      mode === 'sequential'
        ? answered
        : [
            answered[
              Math.floor(
                mulberry32(hashString(`${seed}:${entity.id}:facet`))() *
                  answered.length
              )
            ],
          ]

    for (const facet of facets) {
      const rand = mulberry32(hashString(`${seed}:${entity.id}:${facet.id}`))
      const correctId = entity.answers[facet.id]
      const options = sampleOptions(facet, correctId, optionCount, rand)
      questions.push({
        question: facet.prompt.replace(/\{entity\}/g, entity.entity),
        entity: entity.entity,
        subtitle: entity.subtitle,
        options: options.map((g) => g.label),
        optionHints: options.some((g) => g.hint)
          ? options.map((g) => g.hint)
          : undefined,
        correctAnswer: options.findIndex((g) => g.id === correctId),
        explain: entity.explain?.[facet.id],
      })
    }
  }
  return questions
}
