import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { ClassifyQuizData } from '@/types/quiz'
import { generateClassifyQuestions } from './generate'
import { validateClassifyQuiz } from './validate'

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'public', 'data', 'classify')

function loadSeed(slug: string): ClassifyQuizData {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${slug}.json`), 'utf8'))
}

describe.each(['dino-classification', 'ml-learning-paradigms'])('%s', (slug) => {
  it('passes validation', () => {
    expect(() => validateClassifyQuiz(loadSeed(slug))).not.toThrow()
  })

  it('generates well-formed questions', () => {
    const questions = generateClassifyQuestions(loadSeed(slug), 42)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(10)
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(q.correctAnswer).toBeLessThan(q.options.length)
      expect(q.question).not.toContain('{entity}')
    }
  })
})
