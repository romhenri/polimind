import { describe, expect, it } from 'vitest'
import { parseQuizJson, quizToDataFile, parseGlossaryJson, slugify } from './aiQuiz'
import { glossaryToDataFile } from './localGlossaries'

const optionsQuiz = {
  id: 'roman-empire',
  name: 'Roman Empire',
  description: 'The fall of Rome',
  color: 'purple',
  category: 'history',
  tags: ['rome'],
  questions: [
    { question: 'When did the Western Empire fall?', options: ['476', '1453'], correctAnswer: 0, explain: 'AD 476.' },
  ],
}

describe('parseQuizJson', () => {
  it('parses an options quiz', () => {
    const quiz = parseQuizJson(JSON.stringify(optionsQuiz))
    expect(quiz.type).toBe('options')
    expect(quiz.questions).toHaveLength(1)
    expect(quiz.id).toBe('roman-empire')
  })

  it('parses a bool quiz', () => {
    const quiz = parseQuizJson(
      JSON.stringify({ ...optionsQuiz, type: 'bool', questions: [{ question: 'Rome fell in 476?', result: true }] })
    )
    expect(quiz.type).toBe('bool')
    expect(quiz.questions[0]).toMatchObject({ result: true })
  })

  it('preserves seq and lang on import', () => {
    const quiz = parseQuizJson(JSON.stringify({ ...optionsQuiz, seq: '3', lang: 'pt' }))
    expect(quiz.seq).toBe(3)
    expect(quiz.lang).toBe('pt')
  })

  it('rejects empty and invalid JSON', () => {
    expect(() => parseQuizJson('')).toThrow()
    expect(() => parseQuizJson('{ not json')).toThrow()
  })

  it('rejects a quiz with no valid questions', () => {
    expect(() => parseQuizJson(JSON.stringify({ ...optionsQuiz, questions: [] }))).toThrow()
  })
})

describe('quizToDataFile', () => {
  it('round-trips seq and lang', () => {
    const quiz = parseQuizJson(JSON.stringify({ ...optionsQuiz, seq: 3, lang: 'pt' }))
    const file = quizToDataFile(quiz)
    expect(file.seq).toBe(3)
    expect(file.lang).toBe('pt')
  })

  it('omits seq, lang, and icon when absent', () => {
    const file = quizToDataFile(parseQuizJson(JSON.stringify(optionsQuiz)))
    expect('seq' in file).toBe(false)
    expect('lang' in file).toBe(false)
    expect('icon' in file).toBe(false)
  })
})

describe('parseGlossaryJson', () => {
  const glossary = {
    id: 'algo-terms',
    name: 'Algorithms',
    color: 'blue',
    category: 'computer_science',
    terms: [{ groupName: 'Sorting', group: [{ term: 'Quicksort', definition: 'A divide-and-conquer sort.' }] }],
  }

  it('parses groups from terms', () => {
    const g = parseGlossaryJson(JSON.stringify(glossary))
    expect(g.id).toBe('algo-terms')
    expect(g.groups[0].group[0].term).toBe('Quicksort')
  })

  it('round-trips through glossaryToDataFile', () => {
    const g = parseGlossaryJson(JSON.stringify(glossary))
    const file = glossaryToDataFile(g)
    expect(file.terms).toEqual(g.groups)
    expect(parseGlossaryJson(JSON.stringify(file)).groups).toEqual(g.groups)
  })

  it('rejects a glossary with no valid terms', () => {
    expect(() => parseGlossaryJson(JSON.stringify({ ...glossary, terms: [] }))).toThrow()
  })
})

describe('slugify', () => {
  it('kebab-cases and falls back', () => {
    expect(slugify('The Fall of Rome!')).toBe('the-fall-of-rome')
    expect(slugify('   ')).toBe('ai-quiz')
  })
})
