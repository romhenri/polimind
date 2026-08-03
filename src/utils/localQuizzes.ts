import { QuizMetadata } from '@/types/quiz'

const STORAGE_KEY = 'polimind.localQuizzes'

function readStore(): Record<string, QuizMetadata> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, QuizMetadata>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getLocalQuizzes(): QuizMetadata[] {
  return Object.values(readStore())
}

export function getLocalQuiz(id: string): QuizMetadata | null {
  return readStore()[id] ?? null
}

export function saveLocalQuiz(quiz: QuizMetadata): void {
  const store = readStore()
  store[quiz.id] = quiz
  writeStore(store)
}

export function deleteLocalQuiz(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}

export function hasLocalQuiz(id: string): boolean {
  return id in readStore()
}

interface FileSystemWritableStream {
  write(data: string): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableStream>
}

type SaveFilePicker = (options: {
  suggestedName?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}) => Promise<FileSystemFileHandleLike>

export async function writeJsonFile(filename: string, json: string): Promise<boolean> {
  const showSaveFilePicker = (window as typeof window & { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker

  if (showSaveFilePicker) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false
    }
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return true
}

export async function downloadLocalQuiz(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const quiz = getLocalQuiz(id)
  if (!quiz) return false
  return writeJsonFile(`${quiz.id}.json`, JSON.stringify(quiz, null, 2))
}
