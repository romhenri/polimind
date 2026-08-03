import { describe, expect, it } from 'vitest'
import { CLASSIFY_QUESTIONS_PER_RUN, ClassifyFacet, ClassifyQuizData } from '@/types/quiz'
import { generateClassifyQuestions, mulberry32, sampleOptions } from './generate'
import { validateClassifyQuiz } from './validate'

const orderFacet: ClassifyFacet = {
  id: 'order',
  label: 'Order',
  prompt: 'Which order does {entity} belong to?',
  groups: [
    { id: 'saurischia', label: 'Saurischia' },
    { id: 'ornithischia', label: 'Ornithischia' },
    { id: 'pterosauria', label: 'Pterosauria' },
    { id: 'plesiosauria', label: 'Plesiosauria' },
  ],
}

const familyFacet: ClassifyFacet = {
  id: 'family',
  label: 'Family',
  prompt: 'Which family does {entity} belong to?',
  parent: 'order',
  groups: [
    { id: 'tyrannosauridae', label: 'Tyrannosauridae', parentGroup: 'saurischia' },
    { id: 'dromaeosauridae', label: 'Dromaeosauridae', parentGroup: 'saurischia' },
    { id: 'allosauridae', label: 'Allosauridae', parentGroup: 'saurischia' },
    { id: 'spinosauridae', label: 'Spinosauridae', parentGroup: 'saurischia' },
    { id: 'ceratopsidae', label: 'Ceratopsidae', parentGroup: 'ornithischia' },
    { id: 'hadrosauridae', label: 'Hadrosauridae', parentGroup: 'ornithischia' },
  ],
}

const quiz: ClassifyQuizData = {
  id: 'test-quiz',
  facets: [orderFacet, familyFacet],
  entities: [
    {
      id: 'trex',
      entity: 'Tyrannosaurus rex',
      subtitle: 'Late Cretaceous',
      answers: { order: 'saurischia', family: 'tyrannosauridae' },
      explain: { order: 'Theropod.', family: 'Two-fingered forelimbs.' },
    },
    {
      id: 'stegosaurus',
      entity: 'Stegosaurus',
      answers: { order: 'ornithischia' },
      explain: { order: 'Bird-hipped.' },
    },
    {
      id: 'triceratops',
      entity: 'Triceratops',
      answers: { order: 'ornithischia', family: 'ceratopsidae' },
    },
  ],
}

describe('sampleOptions', () => {
  it('always includes the correct group', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = sampleOptions(orderFacet, 'saurischia', 4, mulberry32(seed))
      expect(options.map((g) => g.id)).toContain('saurischia')
    }
  })

  it('never produces duplicate options', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = sampleOptions(familyFacet, 'tyrannosauridae', 4, mulberry32(seed))
      const ids = options.map((g) => g.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('respects the requested option count', () => {
    const options = sampleOptions(orderFacet, 'saurischia', 3, mulberry32(1))
    expect(options).toHaveLength(3)
  })

  it('clamps the option count to the group pool size', () => {
    const options = sampleOptions(orderFacet, 'saurischia', 10, mulberry32(1))
    expect(options).toHaveLength(4)
  })

  it('prefers up to two siblings of the correct group', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = sampleOptions(familyFacet, 'tyrannosauridae', 4, mulberry32(seed))
      const siblings = options.filter(
        (g) => g.id !== 'tyrannosauridae' && g.parentGroup === 'saurischia'
      )
      expect(siblings).toHaveLength(2)
    }
  })

  it('fills remaining slots from siblings when non-siblings run out', () => {
    const allSiblings: ClassifyFacet = {
      ...familyFacet,
      groups: familyFacet.groups.filter((g) => g.parentGroup === 'saurischia'),
    }
    const options = sampleOptions(allSiblings, 'tyrannosauridae', 4, mulberry32(1))
    expect(options).toHaveLength(4)
  })

  it('is deterministic for a fixed seed', () => {
    const a = sampleOptions(familyFacet, 'ceratopsidae', 4, mulberry32(7))
    const b = sampleOptions(familyFacet, 'ceratopsidae', 4, mulberry32(7))
    expect(a).toEqual(b)
  })
})

describe('generateClassifyQuestions', () => {
  it('is deterministic for a fixed seed', () => {
    expect(generateClassifyQuestions(quiz, 123)).toEqual(
      generateClassifyQuestions(quiz, 123)
    )
  })

  it('varies with the seed', () => {
    expect(generateClassifyQuestions(quiz, 1)).not.toEqual(
      generateClassifyQuestions(quiz, 2)
    )
  })

  it('marks the correct option with its group label', () => {
    for (const q of generateClassifyQuestions(quiz, 42)) {
      const allLabels = [...orderFacet.groups, ...familyFacet.groups].map((g) => g.label)
      expect(allLabels).toContain(q.options[q.correctAnswer])
    }
  })

  it('emits every (entity, facet) pair when the pool is smaller than the cap', () => {
    const questions = generateClassifyQuestions(quiz, 42)
    expect(questions).toHaveLength(5)
    const trexQuestions = questions
      .filter((q) => q.entity === 'Tyrannosaurus rex')
      .map((q) => q.question)
    expect(trexQuestions).toHaveLength(2)
    expect(trexQuestions).toContain('Which order does Tyrannosaurus rex belong to?')
    expect(trexQuestions).toContain('Which family does Tyrannosaurus rex belong to?')
  })

  it('caps a large pool at CLASSIFY_QUESTIONS_PER_RUN questions', () => {
    const bigQuiz: ClassifyQuizData = {
      ...quiz,
      entities: Array.from({ length: 30 }, (_, i) => ({
        id: `e${i}`,
        entity: `Entity ${i}`,
        answers: { order: 'saurischia' },
      })),
    }
    expect(generateClassifyQuestions(bigQuiz, 42)).toHaveLength(CLASSIFY_QUESTIONS_PER_RUN)
  })

  it('carries subtitle and explain through to the question', () => {
    const questions = generateClassifyQuestions(quiz, 42)
    const trexOrder = questions.find(
      (q) => q.entity === 'Tyrannosaurus rex' && q.question.includes('order')
    )!
    expect(trexOrder.subtitle).toBe('Late Cretaceous')
    expect(trexOrder.explain).toBe('Theropod.')
  })
})

describe('validateClassifyQuiz', () => {
  it('accepts a valid quiz', () => {
    expect(() => validateClassifyQuiz(quiz)).not.toThrow()
  })

  it('rejects an answer that is not a group of the facet', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      entities: [
        { id: 'x', entity: 'X', answers: { order: 'nope' } },
      ],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow(
      '[classify] test-quiz at entities[0].answers.order'
    )
  })

  it('rejects an entity without answers', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      entities: [{ id: 'x', entity: 'X', answers: {} }],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow('entities[0].answers')
  })

  it('rejects a facet with fewer than two groups', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      facets: [{ ...orderFacet, groups: orderFacet.groups.slice(0, 1) }],
      entities: [{ id: 'x', entity: 'X', answers: { order: 'saurischia' } }],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow('facets[0].groups')
  })

  it('rejects a parent facet reference that does not exist', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      facets: [orderFacet, { ...familyFacet, parent: 'ghost' }],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow('facets[1].parent')
  })

  it('rejects a group with an invalid parentGroup', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      facets: [
        orderFacet,
        {
          ...familyFacet,
          groups: [
            ...familyFacet.groups.slice(0, 5),
            { id: 'weird', label: 'Weird', parentGroup: 'ghost' },
          ],
        },
      ],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow('parentGroup')
  })

  it('rejects duplicate ids', () => {
    const bad: ClassifyQuizData = {
      ...quiz,
      entities: [...quiz.entities, { ...quiz.entities[0] }],
    }
    expect(() => validateClassifyQuiz(bad)).toThrow('duplicate entity id "trex"')
  })
})
