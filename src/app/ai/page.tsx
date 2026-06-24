'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FaKey,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaPlay,
  FaSpinner,
  FaPen,
} from 'react-icons/fa'
import { FaWandMagicSparkles, FaRobot } from 'react-icons/fa6'
import { QuizMetadata } from '@/types/quiz'
import { generateQuiz, regenerateQuestion, quizToDataFile } from '@/utils/geminiQuiz'
import AiQuizRunner from './AiQuizRunner'
import MetaEditor from './MetaEditor'
import QuestionList from './QuestionList'

const API_KEY_STORAGE = 'polimind.geminiKey'

export default function AiPage() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [subject, setSubject] = useState('')
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizMetadata | null>(null)
  const [usedModel, setUsedModel] = useState('')
  const [view, setView] = useState<'form' | 'quiz'>('form')
  const [editing, setEditing] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE)
    if (stored) setApiKey(stored)
  }, [])

  const dataFile = useMemo(() => (quiz ? quizToDataFile(quiz) : null), [quiz])
  const jsonPreview = useMemo(() => (dataFile ? JSON.stringify(dataFile, null, 2) : ''), [dataFile])

  const canGenerate = apiKey.trim() !== '' && subject.trim() !== '' && !loading

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setQuiz(null)
    setEditing(false)
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim())
    try {
      const result = await generateQuiz(apiKey.trim(), subject.trim(), count)
      setQuiz(result.quiz)
      setUsedModel(result.model)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the quiz.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMeta = (meta: Partial<QuizMetadata>) => {
    setQuiz((prev) => (prev ? { ...prev, ...meta } : prev))
    setEditing(false)
  }

  const handleRegenerateQuestion = async (index: number, instructions?: string) => {
    if (!quiz || regeneratingIndex !== null) return
    setRegeneratingIndex(index)
    setRegenError(null)
    try {
      const result = await regenerateQuestion(apiKey.trim(), quiz, index, instructions)
      setQuiz((prev) => {
        if (!prev) return prev
        const questions = [...prev.questions]
        questions[index] = result.question
        return { ...prev, questions }
      })
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Failed to regenerate the question.')
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const handleDownload = () => {
    if (!quiz || !dataFile) return
    const blob = new Blob([JSON.stringify(dataFile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${quiz.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'quiz' && quiz) {
    return <AiQuizRunner quiz={quiz} onExit={() => setView('form')} />
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold tracking-wide uppercase rounded-full text-purple-700 bg-purple-100 dark:text-purple-200 dark:bg-purple-900/50">
          <FaRobot /> AI generator
        </span>
        <h1 className="mb-2 text-4xl font-bold tracking-wide font-display sm:text-5xl">
          polimind<span className="text-purple-600 dark:text-purple-400">.ai</span>
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg">
          Generate a custom quiz with Gemini and start playing instantly.
        </p>
      </div>

      <div className="p-6 bg-white border-2 rounded-xl border-purple-200 dark:bg-stone-900 dark:border-purple-900/60">
        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Gemini API key
        </label>
        <div className="relative mb-1">
          <FaKey className="absolute -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2" aria-hidden />
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API key"
            autoComplete="off"
            className="w-full py-3 pl-12 pr-12 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute flex items-center justify-center -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <p className="mb-5 text-xs text-stone-500 dark:text-stone-400">
          Stored only in this browser. Get one at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Google AI Studio
          </a>
          .
        </p>

        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Quiz subject
        </label>
        <textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          rows={3}
          placeholder="e.g. The fall of the Roman Empire, React hooks, basics of organic chemistry..."
          className="w-full px-4 py-3 mb-2 text-sm border-2 rounded-lg resize-none border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
        />
        <p className="mb-5 text-xs text-stone-500 dark:text-stone-400">
          polimind automatically adds the formatting instructions so the output works as a playable quiz.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-32">
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Questions
            </label>
            <input
              type="number"
              min={4}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 10)))}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FaWandMagicSparkles /> Generate quiz
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 mt-4 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
            {error}
          </div>
        )}
      </div>

      {quiz && (
        <div className="p-6 mt-6 bg-white border-2 rounded-xl border-purple-200 dark:bg-stone-900 dark:border-purple-900/60 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl">
              {quiz.name}
            </h2>
            <div className="flex items-center flex-shrink-0 gap-3">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {quiz.questions.length} questions
              </span>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-stone-800"
                >
                  <FaPen /> Edit
                </button>
              )}
            </div>
          </div>

          {usedModel && (
            <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
              Generated with {usedModel}
            </p>
          )}

          {editing ? (
            <MetaEditor quiz={quiz} onSave={handleSaveMeta} onCancel={() => setEditing(false)} />
          ) : (
            <>
              {quiz.description && (
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">{quiz.description}</p>
              )}

              <QuestionList
                quiz={quiz}
                regeneratingIndex={regeneratingIndex}
                error={regenError}
                onRegenerate={handleRegenerateQuestion}
              />

              <details className="mt-5 group">
                <summary className="text-sm font-semibold cursor-pointer select-none text-purple-700 dark:text-purple-300 hover:underline">
                  View raw JSON
                </summary>
                <pre className="p-4 mt-3 overflow-auto text-xs leading-relaxed border-2 rounded-lg max-h-72 border-purple-100 bg-purple-50/50 text-stone-700 dark:border-purple-900/40 dark:bg-stone-800 dark:text-stone-200">
                  {jsonPreview}
                </pre>
              </details>

              <div className="flex flex-col gap-3 mt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-purple-700 border-purple-500 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-400 dark:hover:bg-stone-800"
                >
                  <FaDownload /> Download JSON
                </button>
                <button
                  type="button"
                  onClick={() => setView('quiz')}
                  className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 active:bg-purple-800"
                >
                  <FaPlay /> Start quiz
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
