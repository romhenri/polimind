import { describe, expect, it } from 'vitest'
import path from 'path'
import { resolveTargetPath } from './route'

describe('resolveTargetPath', () => {
  it('maps each kind to its dir', () => {
    expect(resolveTargetPath('quiz', 'x')).toBe(path.join(process.cwd(), 'public/data', 'x.json'))
    expect(resolveTargetPath('classify', 'x')).toBe(path.join(process.cwd(), 'public/data/classify', 'x.json'))
    expect(resolveTargetPath('glossary', 'x')).toBe(path.join(process.cwd(), 'public/data/glossaries', 'x.json'))
  })

  it('rejects unknown kind', () => {
    expect(resolveTargetPath('bad', 'x')).toBeNull()
    expect(resolveTargetPath(undefined, 'x')).toBeNull()
  })

  it('rejects path traversal and empty ids', () => {
    expect(resolveTargetPath('quiz', '../etc/passwd')).toBeNull()
    expect(resolveTargetPath('quiz', 'a/b')).toBeNull()
    expect(resolveTargetPath('quiz', '..')).toBeNull()
    expect(resolveTargetPath('quiz', '')).toBeNull()
    expect(resolveTargetPath('quiz', 42)).toBeNull()
  })
})
