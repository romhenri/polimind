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
  FaCopy,
  FaCheck,
  FaFileImport,
  FaUpload,
} from 'react-icons/fa'
import { FaWandMagicSparkles } from 'react-icons/fa6'
import { QuizMetadata, OptionsQuestion } from '@/types/quiz'
import { generateQuiz, regenerateQuestion, quizToDataFile, buildCopyPrompt, parseQuizJson } from '@/utils/aiQuiz'
import AiQuizRunner from './AiQuizRunner'
import MetaEditor from './MetaEditor'
import QuestionList from './QuestionList'

const OPENROUTER_KEY_STORAGE = 'polimind.openRouterKey'
const GEMINI_KEY_STORAGE = 'polimind.geminiKey'

export default function AiPage() {
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [subject, setSubject] = useState('')
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizMetadata | null>(null)
  const [usedModel, setUsedModel] = useState('')
  const [view, setView] = useState<'form' | 'quiz'>('form')
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate')
  const [editing, setEditing] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    const storedOpenRouterKey = localStorage.getItem(OPENROUTER_KEY_STORAGE)
    const storedGeminiKey = localStorage.getItem(GEMINI_KEY_STORAGE)
    if (storedOpenRouterKey) setOpenRouterKey(storedOpenRouterKey)
    if (storedGeminiKey) setGeminiKey(storedGeminiKey)
  }, [])

  const dataFile = useMemo(() => (quiz ? quizToDataFile(quiz) : null), [quiz])
  const jsonPreview = useMemo(() => (dataFile ? JSON.stringify(dataFile, null, 2) : ''), [dataFile])

  const hasAiKey = openRouterKey.trim() !== '' || geminiKey.trim() !== ''
  const canGenerate = hasAiKey && subject.trim() !== '' && !loading
  const canCopy = subject.trim() !== ''

  const handleCopyPrompt = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(buildCopyPrompt(subject.trim(), count))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard. Copy it manually from the JSON preview instead.')
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setQuiz(null)
    setEditing(false)
    localStorage.setItem(OPENROUTER_KEY_STORAGE, openRouterKey.trim())
    localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey.trim())
    try {
      const result = await generateQuiz(
        { openRouterKey: openRouterKey.trim(), geminiKey: geminiKey.trim() },
        subject.trim(),
        count
      )
      setQuiz(result.quiz)
      setUsedModel(result.model)
      setActiveTab('edit')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the quiz.')
    } finally {
      setLoading(false)
    }
  }

  const handleImportJson = () => {
    setImportError(null)
    try {
      const imported = parseQuizJson(importJson)
      setQuiz(imported)
      setUsedModel('')
      setEditing(false)
      setActiveTab('edit')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import this JSON.')
    }
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setImportJson(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setImportError('Could not read the selected file.')
    reader.readAsText(file)
  }

  const handleSaveMeta = (meta: Partial<QuizMetadata>) => {
    setQuiz((prev) => (prev ? { ...prev, ...meta } : prev))
    setEditing(false)
  }

  const handleUpdateQuestion = (index: number, question: OptionsQuestion) => {
    setQuiz((prev) => {
      if (!prev) return prev
      const questions = [...prev.questions]
      questions[index] = question
      return { ...prev, questions }
    })
  }

  const handleRegenerateQuestion = async (index: number, instructions?: string) => {
    if (!quiz || regeneratingIndex !== null) return
    setRegeneratingIndex(index)
    setRegenError(null)
    try {
      const result = await regenerateQuestion(
        { openRouterKey: openRouterKey.trim(), geminiKey: geminiKey.trim() },
        quiz,
        index,
        instructions
      )
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
        <h1 className="mt-4 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          Polimind<span className="text-plum-600 dark:text-plum-400">.ai</span>
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          Generate a custom quiz with AI and start playing instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 mb-6 border-2 rounded-xl border-plum-200 bg-plum-50/50 dark:border-plum-900/60 dark:bg-stone-900">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-lg ${
            activeTab === 'generate'
              ? 'bg-plum-600 text-white'
              : 'text-plum-700 hover:bg-plum-100 dark:text-plum-300 dark:hover:bg-stone-800'
          }`}
        >
          <FaWandMagicSparkles /> 1. Generate
        </button>
        <button
          type="button"
          onClick={() => quiz && setActiveTab('edit')}
          disabled={!quiz}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-lg disabled:cursor-not-allowed disabled:opacity-50 ${
            activeTab === 'edit'
              ? 'bg-plum-600 text-white'
              : 'text-plum-700 hover:bg-plum-100 dark:text-plum-300 dark:hover:bg-stone-800'
          }`}
        >
          <FaPen /> 2. Edit
        </button>
      </div>

      <div className={`p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 ${activeTab === 'generate' ? '' : 'hidden'}`}>
        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          OpenRouter API key
        </label>
        <div className="relative mb-1">
          <FaKey className="absolute -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2" aria-hidden />
          <input
            type={showOpenRouterKey ? 'text' : 'password'}
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            placeholder="Paste your OpenRouter API key"
            autoComplete="off"
            className="w-full py-3 pl-12 pr-12 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowOpenRouterKey((v) => !v)}
            className="absolute flex items-center justify-center -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label={showOpenRouterKey ? 'Hide OpenRouter API key' : 'Show OpenRouter API key'}
          >
            {showOpenRouterKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <p className="mb-5 text-xs text-stone-500 dark:text-stone-400">
          Stored only in this browser. Get one at{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-plum-600 dark:text-plum-400 hover:underline"
          >
            openrouter.ai/keys
          </a>
          .
        </p>

        <details className="mb-5 group">
          <summary className="text-sm font-semibold cursor-pointer select-none text-stone-600 dark:text-stone-300 hover:underline">
            Gemini fallback (optional)
          </summary>
          <div className="pt-4">
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Gemini API key
            </label>
            <div className="relative mb-1">
              <FaKey className="absolute -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2" aria-hidden />
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Paste your Gemini API key"
                autoComplete="off"
                className="w-full py-3 pl-12 pr-12 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
                className="absolute flex items-center justify-center -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label={showGeminiKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
              >
                {showGeminiKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Used only if OpenRouter fails. Get one at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-plum-600 dark:text-plum-400 hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>
        </details>

        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Quiz subject
        </label>
        <textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          rows={3}
          placeholder="e.g. The fall of the Roman Empire, React hooks, basics of organic chemistry..."
          className="w-full px-4 py-3 mb-2 text-sm border-2 rounded-lg resize-none border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
        />
        <p className="mb-5 text-xs text-stone-500 dark:text-stone-400">
          polimind automatically adds the formatting instructions so the output works as a playable quiz.
        </p>

        <div className="mb-4 sm:w-40">
          <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Questions
          </label>
          <input
            type="number"
            min={4}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 10)))}
            className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleCopyPrompt}
            disabled={!canCopy}
            title="Copy a ready-to-use prompt to paste into any AI chat"
            className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <>
                <FaCheck /> Copied!
              </>
            ) : (
              <>
                <FaCopy /> Copy prompt
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className={`p-6 mt-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 ${activeTab === 'generate' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2 mb-2">
          <FaFileImport className="text-plum-500" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-800 dark:text-white">
            Import existing JSON
          </h2>
        </div>
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          Already have a quiz JSON? Paste it or upload a file to edit it directly — it&apos;s validated before importing.
        </p>

        <textarea
          value={importJson}
          onChange={(e) => {
            setImportJson(e.target.value)
            if (importError) setImportError(null)
          }}
          rows={6}
          placeholder='{ "id": "my-quiz", "name": "...", "questions": [ ... ] }'
          className="w-full px-4 py-3 mb-3 font-mono text-xs border-2 rounded-lg resize-y border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg cursor-pointer text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800">
            <FaUpload /> Upload file
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            onClick={handleImportJson}
            disabled={importJson.trim() === ''}
            className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaFileImport /> Import &amp; edit
          </button>
        </div>

        {importError && (
          <div className="p-3 mt-4 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
            {importError}
          </div>
        )}
      </div>

      {quiz && activeTab === 'edit' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl">
              {quiz.name}
            </h2>
            <div className="flex items-center flex-shrink-0 gap-3">
              <span className="text-sm font-semibold text-plum-600 dark:text-plum-400">
                {quiz.questions.length} questions
              </span>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800"
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
                onUpdateQuestion={handleUpdateQuestion}
              />

              <details className="mt-5 group">
                <summary className="text-sm font-semibold cursor-pointer select-none text-plum-700 dark:text-plum-300 hover:underline">
                  View raw JSON
                </summary>
                <pre className="p-4 mt-3 overflow-auto text-xs leading-relaxed border-2 rounded-lg max-h-72 border-plum-100 bg-plum-50/50 text-stone-700 dark:border-plum-900/40 dark:bg-stone-800 dark:text-stone-200">
                  {jsonPreview}
                </pre>
              </details>

              <div className="flex flex-col gap-3 mt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800"
                >
                  <FaDownload /> Download JSON
                </button>
                <button
                  type="button"
                  onClick={() => setView('quiz')}
                  className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
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
