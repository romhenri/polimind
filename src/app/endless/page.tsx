'use client'

import { useEffect, useRef, useState } from 'react'
import { FaKey, FaEye, FaEyeSlash, FaCheck, FaTimes, FaSpinner, FaInfinity, FaTrash, FaPlay } from 'react-icons/fa'
import type { OptionsQuestion } from '@/types/quiz'
import {
  generateEndlessBatch,
  fetchOpenRouterFreeModels,
  slugify,
  GEMINI_MODELS,
  type AiProvider,
  type AiSettings,
  type OpenRouterModelOption,
} from '@/utils/aiQuiz'
import {
  getEndlessRounds,
  saveEndlessRound,
  deleteEndlessRound,
  type EndlessRound,
} from '@/utils/localEndlessRounds'
import { CATEGORIES } from '@/data/categories'

const OPENROUTER_KEY_STORAGE = 'polimind.openRouterKey'
const GEMINI_KEY_STORAGE = 'polimind.geminiKey'
const PROVIDER_STORAGE = 'polimind.aiProvider'
const OPENROUTER_MODEL_STORAGE = 'polimind.openRouterModel'
const GEMINI_MODEL_STORAGE = 'polimind.endlessGeminiModel'

const INITIAL_COUNT = 10
const BATCH_COUNT = 5
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function EndlessPage() {
  const [provider, setProvider] = useState<AiProvider>('openrouter')
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [openRouterModel, setOpenRouterModel] = useState('')
  const [geminiModel, setGeminiModel] = useState('')
  const [freeModels, setFreeModels] = useState<OpenRouterModelOption[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [category, setCategory] = useState('general')
  const [topic, setTopic] = useState('')

  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState<OptionsQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rounds, setRounds] = useState<EndlessRound[]>([])
  const triggeredAt = useRef(0)
  const roundIdRef = useRef<string | null>(null)

  useEffect(() => {
    setOpenRouterKey(localStorage.getItem(OPENROUTER_KEY_STORAGE) ?? '')
    setGeminiKey(localStorage.getItem(GEMINI_KEY_STORAGE) ?? '')
    setOpenRouterModel(localStorage.getItem(OPENROUTER_MODEL_STORAGE) ?? '')
    setGeminiModel(localStorage.getItem(GEMINI_MODEL_STORAGE) ?? '')
    const storedProvider = localStorage.getItem(PROVIDER_STORAGE)
    if (storedProvider === 'openrouter' || storedProvider === 'gemini') setProvider(storedProvider)
    setRounds(getEndlessRounds())
  }, [])

  useEffect(() => {
    if (!started || !roundIdRef.current || questions.length === 0) return
    const id = roundIdRef.current
    const existing = getEndlessRounds().find((r) => r.id === id)
    saveEndlessRound({
      id,
      topic: topic.trim(),
      category,
      questions,
      answers,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    })
    // topic/category are fixed once a round starts; only questions/answers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, questions, answers])

  useEffect(() => {
    if (provider !== 'openrouter' || freeModels.length > 0 || modelsLoading) return
    let cancelled = false
    setModelsLoading(true)
    setModelsError(null)
    fetchOpenRouterFreeModels()
      .then((models) => {
        if (cancelled) return
        setFreeModels(models)
        setOpenRouterModel((current) =>
          current && !models.some((m) => m.id === current) ? '' : current
        )
      })
      .catch(() => {
        if (!cancelled) setModelsError('Could not load the model list — Auto still works.')
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  const activeKey = provider === 'openrouter' ? openRouterKey : geminiKey
  const setActiveKey = provider === 'openrouter' ? setOpenRouterKey : setGeminiKey
  const canStart = activeKey.trim() !== '' && topic.trim() !== '' && !loadingInitial

  const buildSettings = (): AiSettings => ({
    provider,
    apiKey: activeKey.trim(),
    temperature: 0.8,
    ...(provider === 'openrouter' && openRouterModel ? { model: openRouterModel } : {}),
    ...(provider === 'gemini' && geminiModel ? { model: geminiModel } : {}),
  })

  const weakQuestions = () =>
    questions
      .filter((_, i) => i in answers && answers[i] !== questions[i].correctAnswer)
      .map((q) => q.question)

  const fetchBatch = async (count: number) => {
    const result = await generateEndlessBatch(
      buildSettings(),
      topic.trim(),
      count,
      category,
      questions.map((q) => q.question),
      weakQuestions()
    )
    const fresh = result.quiz.questions.filter(
      (q): q is OptionsQuestion => 'options' in q
    )
    setQuestions((prev) => [...prev, ...fresh])
  }

  const handleStart = async () => {
    setLoadingInitial(true)
    setError(null)
    localStorage.setItem(OPENROUTER_KEY_STORAGE, openRouterKey.trim())
    localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey.trim())
    localStorage.setItem(PROVIDER_STORAGE, provider)
    localStorage.setItem(OPENROUTER_MODEL_STORAGE, openRouterModel)
    localStorage.setItem(GEMINI_MODEL_STORAGE, geminiModel)
    try {
      setQuestions([])
      setAnswers({})
      triggeredAt.current = 0
      roundIdRef.current = `${slugify(topic.trim())}-${Date.now()}`
      await fetchBatch(INITIAL_COUNT)
      setStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the quiz.')
    } finally {
      setLoadingInitial(false)
    }
  }

  const handleResume = (round: EndlessRound) => {
    roundIdRef.current = round.id
    setTopic(round.topic)
    setCategory(round.category)
    setQuestions(round.questions)
    setAnswers(round.answers)
    triggeredAt.current = round.questions.length
    setError(null)
    setStarted(true)
  }

  const handleDeleteRound = (id: string) => {
    deleteEndlessRound(id)
    setRounds((prev) => prev.filter((r) => r.id !== id))
  }

  useEffect(() => {
    const answeredCount = Object.keys(answers).length
    const half = Math.ceil(questions.length / 2)
    if (
      started &&
      !loadingMore &&
      questions.length > 0 &&
      answeredCount >= half &&
      triggeredAt.current !== questions.length
    ) {
      triggeredAt.current = questions.length
      setLoadingMore(true)
      setError(null)
      fetchBatch(BATCH_COUNT)
        .catch((err) => {
          triggeredAt.current = 0
          setError(err instanceof Error ? err.message : 'Could not load the next questions.')
        })
        .finally(() => setLoadingMore(false))
    }
    // fetchBatch closes over current questions/answers; re-running on either change is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, questions.length, started, loadingMore])

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (questionIndex in answers) return
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const answeredCount = Object.keys(answers).length
  const correctCount = questions.reduce(
    (total, q, i) => (answers[i] === q.correctAnswer ? total + 1 : total),
    0
  )
  const percentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-3 mt-4 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          <FaInfinity className="text-plum-600 dark:text-plum-400" /> Endless
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          Pick a topic and keep going, new questions generate as you play, focused on what you miss.
        </p>
      </div>

      {!started && rounds.length > 0 && (
        <div className="p-6 mb-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60">
          <h2 className="mb-4 text-lg font-semibold text-stone-800 dark:text-white">
            Continue a round
          </h2>
          <div className="space-y-2">
            {rounds.map((round) => {
              const answered = Object.keys(round.answers).length
              const correct = round.questions.reduce(
                (total, q, i) => (round.answers[i] === q.correctAnswer ? total + 1 : total),
                0
              )
              return (
                <div
                  key={round.id}
                  className="flex items-center justify-between gap-3 p-3 border-2 rounded-lg border-stone-200 dark:border-stone-700"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-stone-800 dark:text-stone-100">
                      {round.topic}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {correct}/{answered} correct · {round.questions.length} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResume(round)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white transition-colors rounded-lg bg-plum-600 hover:bg-plum-700 active:bg-plum-800"
                    >
                      <FaPlay /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRound(round.id)}
                      aria-label="Delete round"
                      className="flex items-center justify-center w-9 h-9 transition-colors border-2 rounded-lg text-stone-400 border-stone-200 hover:text-red-600 hover:border-red-300 dark:border-stone-700 dark:hover:text-red-400"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!started && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60">
          <div className="grid gap-4 mb-5 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
                Model provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="w-full px-4 py-3 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Model
            </label>
            {provider === 'openrouter' ? (
              <>
                <select
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  disabled={modelsLoading}
                  className="w-full px-4 py-3 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white disabled:opacity-60"
                >
                  <option value="">Auto (best available free model)</option>
                  {freeModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {modelsLoading
                    ? 'Loading free models from OpenRouter…'
                    : modelsError
                      ? modelsError
                      : `Auto lets OpenRouter route your request. Or pin one of ${freeModels.length} free models.`}
                </p>
              </>
            ) : (
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              >
                <option value="">Auto (try the fastest first)</option>
                {GEMINI_MODELS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            {provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key
          </label>
          <div className="relative mb-5">
            <FaKey className="absolute -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2" aria-hidden />
            <input
              type={showApiKey ? 'text' : 'password'}
              value={activeKey}
              onChange={(e) => setActiveKey(e.target.value)}
              placeholder={`Paste your ${provider === 'openrouter' ? 'OpenRouter' : 'Gemini'} API key`}
              autoComplete="off"
              className="w-full py-3 pl-12 pr-12 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute flex items-center justify-center -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Fourier transforms, the French Revolution, Python generators..."
            className="w-full px-4 py-3 mb-4 text-sm bg-white border-2 rounded-lg border-stone-200 text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="flex items-center justify-center w-full gap-2 px-6 py-3 font-semibold text-white transition-colors rounded-lg bg-plum-600 hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingInitial ? (
              <>
                <FaSpinner className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FaInfinity /> Start
              </>
            )}
          </button>

          {error && (
            <div className="p-3 mt-4 text-sm text-red-700 border-2 border-red-200 rounded-lg bg-red-50 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {started && (
        <div className="animate-fade-in">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-3 mb-5 border-2 rounded-lg border-plum-100 bg-plum-50/90 backdrop-blur dark:border-plum-900/40 dark:bg-stone-900/90">
            <p className="text-sm font-semibold truncate text-stone-700 dark:text-stone-200">
              {topic.trim()}
            </p>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              {correctCount}/{answeredCount} correct
              {answeredCount > 0 && (
                <span className="ml-2 text-plum-600 dark:text-plum-400">{percentage}%</span>
              )}
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => {
              const selected = answers[index]
              const isAnswered = index in answers

              return (
                <div
                  key={index}
                  className="p-4 bg-white border-2 rounded-lg border-stone-200 dark:bg-stone-900 dark:border-stone-700"
                >
                  <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
                    <span className="text-plum-600 dark:text-plum-400">{index + 1}.</span> {question.question}
                  </p>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isCorrect = optionIndex === question.correctAnswer
                      const isSelected = selected === optionIndex

                      let stateClass =
                        'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800'
                      if (isAnswered && isCorrect) {
                        stateClass =
                          'border-green-500 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300'
                      } else if (isAnswered && isSelected) {
                        stateClass =
                          'border-red-500 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
                      } else if (isAnswered) {
                        stateClass = 'border-stone-200 text-stone-400 dark:border-stone-700 dark:text-stone-500'
                      }

                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          onClick={() => handleSelect(index, optionIndex)}
                          disabled={isAnswered}
                          className={`flex items-center w-full gap-3 px-4 py-2.5 text-sm text-left transition-colors border-2 rounded-lg disabled:cursor-default ${stateClass}`}
                        >
                          <span className="flex-shrink-0 font-semibold">
                            {LETTERS[optionIndex] ?? optionIndex + 1}
                          </span>
                          <span className="flex-1">{option}</span>
                          {isAnswered && isCorrect && <FaCheck className="flex-shrink-0" />}
                          {isAnswered && isSelected && !isCorrect && <FaTimes className="flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {isAnswered && question.explain && (
                    <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">{question.explain}</p>
                  )}
                </div>
              )
            })}
          </div>

          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-semibold text-stone-500 dark:text-stone-400">
              <FaSpinner className="animate-spin" /> Generating more questions...
            </div>
          )}

          {error && (
            <div className="p-3 mt-4 text-sm text-red-700 border-2 border-red-200 rounded-lg bg-red-50 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
