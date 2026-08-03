'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaKey,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaSpinner,
  FaPen,
  FaCopy,
  FaCheck,
  FaFileImport,
  FaUpload,
  FaStop,
  FaSlidersH,
  FaInfoCircle,
  FaClipboardCheck,
  FaSave,
} from 'react-icons/fa'
import { FaWandMagicSparkles, FaLayerGroup } from 'react-icons/fa6'
import { QuizMetadata, Question, QuizListing } from '@/types/quiz'
import type { Glossary } from '@/types/glossary'
import { generateQuizStream, regenerateQuestion, quizToDataFile, buildCopyPrompt, buildQuizContext, parseQuizJson, generateGlossary, generateGlossaryTerm, buildGlossaryCopyPrompt, generateClassify, buildClassifyCopyPrompt, regenerateClassifyEntity, fetchOpenRouterFreeModels } from '@/utils/aiQuiz'
import { generateClassifyQuestions } from '@/utils/classify/generate'
import { CATEGORIES, getCategoryById } from '@/data/categories'
import type { StreamCallbacks, AiProvider, AiSettings, GenType, OpenRouterModelOption } from '@/utils/aiQuiz'
import { getLocalQuiz, getLocalQuizzes, saveLocalQuiz } from '@/utils/localQuizzes'
import { saveLocalGlossary, glossaryToDataFile, getLocalGlossary } from '@/utils/localGlossaries'
import { fetchGlossary } from '@/utils/loadGlossaries'
import { loadFullQuizzes, toQuizListing, fetchQuizJson } from '@/utils/loadQuizzes'
import ShufflePracticeModal from '@/components/ShufflePracticeModal'
import AiQuizRunner from './AiQuizRunner'
import MetaEditor from './MetaEditor'
import QuestionList from './QuestionList'
import QuizTester from './QuizTester'
import GlossaryEditor from './GlossaryEditor'
import ClassifyEditor from './ClassifyEditor'

const OPENROUTER_KEY_STORAGE = 'polimind.openRouterKey'
const GEMINI_KEY_STORAGE = 'polimind.geminiKey'
const PROVIDER_STORAGE = 'polimind.aiProvider'
const OPENROUTER_MODEL_STORAGE = 'polimind.openRouterModel'
const REPO_MODE = process.env.NEXT_PUBLIC_TARGET_SAVE === 'repo'

export default function AiPage() {
  const [provider, setProvider] = useState<AiProvider>('openrouter')
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openRouterModel, setOpenRouterModel] = useState('')
  const [freeModels, setFreeModels] = useState<OpenRouterModelOption[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [temperature, setTemperature] = useState('0.8')
  const [category, setCategory] = useState('general')
  const [subcategory, setSubcategory] = useState('')
  const [subject, setSubject] = useState('')
  const [genType, setGenType] = useState<GenType>('options')
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizMetadata | null>(null)
  const [glossary, setGlossary] = useState<Glossary | null>(null)
  const [usedModel, setUsedModel] = useState('')
  const [view, setView] = useState<'form' | 'quiz'>('form')
  const [activeTab, setActiveTab] = useState<'generate' | 'meta' | 'edit' | 'test'>('generate')
  const [editMode, setEditMode] = useState(false)
  const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set())
  const [regenErrors, setRegenErrors] = useState<Record<number, string>>({})
  const [regeneratingEntities, setRegeneratingEntities] = useState<Set<number>>(new Set())
  const [entityErrors, setEntityErrors] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState(false)
  const [savedLocally, setSavedLocally] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [streamProgress, setStreamProgress] = useState<{ current: number; total: number } | null>(null)
  const [streamingQuestions, setStreamingQuestions] = useState<Question[]>([])
  const [streamMeta, setStreamMeta] = useState<Partial<QuizMetadata> | null>(null)
  const [subjects, setSubjects] = useState<QuizListing[]>([])
  const [showContextModal, setShowContextModal] = useState(false)
  const [referenceIds, setReferenceIds] = useState<string[]>([])
  const [referenceQuizzes, setReferenceQuizzes] = useState<QuizMetadata[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (!editId) return
    const localGloss = getLocalGlossary(editId)
    if (localGloss) {
      setGlossary(localGloss)
      setUsedModel('')
      setEditMode(true)
      setActiveTab('meta')
      return
    }
    if (params.get('type') === 'glossary') {
      let cancelled = false
      fetchGlossary(editId).then((g) => {
        if (cancelled) return
        if (g) {
          setGlossary(g)
          setUsedModel('')
          setEditMode(true)
          setActiveTab('meta')
        } else {
          setImportError(`Could not load glossary "${editId}" for editing.`)
        }
      })
      return () => {
        cancelled = true
      }
    }
    const localQuiz = getLocalQuiz(editId)
    if (localQuiz) {
      setQuiz(localQuiz)
      setUsedModel('')
      setEditMode(true)
      setActiveTab('meta')
      return
    }
    let cancelled = false
    const loadForEdit = async () => {
      try {
        const parsed = await fetchQuizJson(editId)
        if (parsed === null) throw new Error('not found')
        const data = Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed
        const imported = parseQuizJson(JSON.stringify(data))
        if (cancelled) return
        setQuiz(imported)
        setUsedModel('')
        setEditMode(true)
        setActiveTab('meta')
      } catch {
        if (!cancelled) setImportError(`Could not load quiz "${editId}" for editing.`)
      }
    }
    loadForEdit()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const listRes = await fetch('/api/quiz-list', { cache: 'no-store' })
        if (!listRes.ok) throw new Error('Failed to load quiz list')
        const { quizzes } = (await listRes.json()) as { quizzes: QuizListing[] }
        const localQuizzes = getLocalQuizzes()
        const localIds = new Set(localQuizzes.map((q) => q.id))
        const remoteSubjects = quizzes.filter((s) => !localIds.has(s.id))
        setSubjects([...remoteSubjects, ...localQuizzes.map(toQuizListing)])
      } catch {
        // Non-fatal: the reference picker just shows an empty pool.
      }
    }
    loadSubjects()
  }, [])

  useEffect(() => {
    const storedOpenRouterKey = localStorage.getItem(OPENROUTER_KEY_STORAGE)
    const storedGeminiKey = localStorage.getItem(GEMINI_KEY_STORAGE)
    const storedProvider = localStorage.getItem(PROVIDER_STORAGE)
    const storedModel = localStorage.getItem(OPENROUTER_MODEL_STORAGE)
    if (storedOpenRouterKey) setOpenRouterKey(storedOpenRouterKey)
    if (storedGeminiKey) setGeminiKey(storedGeminiKey)
    if (storedProvider === 'openrouter' || storedProvider === 'gemini') setProvider(storedProvider)
    if (storedModel) setOpenRouterModel(storedModel)
  }, [])

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
    // Only re-run on provider change; keeping loading/list state out of the deps
    // prevents the setState re-render from cancelling the in-flight fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  const dataFile = useMemo(
    () => (glossary ? glossaryToDataFile(glossary) : quiz ? quizToDataFile(quiz) : null),
    [quiz, glossary]
  )
  const jsonPreview = useMemo(() => (dataFile ? JSON.stringify(dataFile, null, 2) : ''), [dataFile])
  const classifyPreview = useMemo(() => {
    if (!quiz || quiz.type !== 'classify') return null
    try {
      const questions = generateClassifyQuestions(
        { id: quiz.id, config: quiz.config, facets: quiz.facets ?? [], entities: quiz.entities ?? [] },
        12345
      )
      return { questions, error: null as string | null }
    } catch (err) {
      return { questions: [], error: err instanceof Error ? err.message : 'Invalid classify data.' }
    }
  }, [quiz])
  const quizContext = useMemo(() => buildQuizContext(referenceQuizzes), [referenceQuizzes])

  const activeKey = provider === 'openrouter' ? openRouterKey : geminiKey
  const setActiveKey = provider === 'openrouter' ? setOpenRouterKey : setGeminiKey
  const providerLabel = provider === 'openrouter' ? 'OpenRouter' : 'Gemini'
  const parsedTemperature = parseFloat(temperature)
  const effectiveTemperature = Number.isFinite(parsedTemperature)
    ? Math.max(0, Math.min(2, parsedTemperature))
    : 0.8
  const canGenerate = activeKey.trim() !== '' && subject.trim() !== '' && !loading
  const canCopy = subject.trim() !== ''
  const subcategories = getCategoryById(category)?.subcategories ?? []
  const countLabel = genType === 'bool' ? 'Statements' : genType === 'classify' ? 'Entities' : genType === 'glossary' ? 'Terms' : 'Questions'

  const handleCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory)
    const nextSubcategories = getCategoryById(nextCategory)?.subcategories ?? []
    if (!nextSubcategories.includes(subcategory)) setSubcategory('')
  }

  const buildSettings = (): AiSettings => ({
    provider,
    apiKey: activeKey.trim(),
    temperature: effectiveTemperature,
    ...(provider === 'openrouter' && openRouterModel ? { model: openRouterModel } : {}),
  })

  const handleCopyPrompt = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(
        genType === 'glossary'
          ? buildGlossaryCopyPrompt(subject.trim(), count, category, subcategory, quizContext)
          : genType === 'classify'
            ? buildClassifyCopyPrompt(subject.trim(), count, category, subcategory, quizContext)
            : buildCopyPrompt(subject.trim(), count, category, subcategory, quizContext, genType)
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard. Copy it manually from the JSON preview instead.')
    }
  }

  const handleContextConfirm = async (selected: QuizListing[]) => {
    setShowContextModal(false)
    const ids = selected.map((q) => q.id)
    setReferenceIds(ids)
    if (ids.length === 0) {
      setReferenceQuizzes([])
      return
    }
    const full = await loadFullQuizzes(ids)
    setReferenceQuizzes(full)
  }

  const handleClearContext = () => {
    setReferenceIds([])
    setReferenceQuizzes([])
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setStreamProgress(null)
    setStreamingQuestions([])
    setStreamMeta(null)
  }

  const persistKeys = () => {
    localStorage.setItem(OPENROUTER_KEY_STORAGE, openRouterKey.trim())
    localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey.trim())
    localStorage.setItem(PROVIDER_STORAGE, provider)
    localStorage.setItem(OPENROUTER_MODEL_STORAGE, openRouterModel)
  }

  const handleGenerateGlossary = async () => {
    setLoading(true)
    setError(null)
    setQuiz(null)
    setGlossary(null)
    persistKeys()
    try {
      const result = await generateGlossary(
        buildSettings(),
        subject.trim(),
        count,
        category,
        subcategory,
        quizContext
      )
      setGlossary(result.glossary)
      setUsedModel(result.model)
      setActiveTab('edit')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the glossary.')
    } finally {
      setLoading(false)
    }
  }

  const handleAskTerm = async (gi: number, request: string) => {
    if (!glossary) return
    const existing = glossary.groups.flatMap((g) => g.group.map((t) => t.term)).filter(Boolean)
    const term = await generateGlossaryTerm(buildSettings(), glossary.name, request, existing)
    setGlossary((prev) =>
      prev
        ? { ...prev, groups: prev.groups.map((g, i) => (i === gi ? { ...g, group: [...g.group, term] } : g)) }
        : prev
    )
  }

  const handleGenerateClassify = async () => {
    setLoading(true)
    setError(null)
    setQuiz(null)
    setGlossary(null)
    persistKeys()
    try {
      const result = await generateClassify(
        buildSettings(),
        subject.trim(),
        count,
        category,
        subcategory,
        quizContext
      )
      setQuiz(result.quiz)
      setUsedModel(result.model)
      setActiveTab('edit')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the classify quiz.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateEntity = async (index: number) => {
    if (!quiz || regeneratingEntities.has(index)) return
    setRegeneratingEntities((prev) => new Set(prev).add(index))
    setEntityErrors((prev) => {
      if (!(index in prev)) return prev
      const next = { ...prev }
      delete next[index]
      return next
    })
    try {
      const updated = await regenerateClassifyEntity(buildSettings(), quiz, index)
      setQuiz((prev) =>
        prev && prev.entities
          ? { ...prev, entities: prev.entities.map((e, i) => (i === index ? updated : e)) }
          : prev
      )
    } catch (err) {
      setEntityErrors((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : 'Failed to reclassify the entity.',
      }))
    } finally {
      setRegeneratingEntities((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    if (genType === 'glossary') {
      await handleGenerateGlossary()
      return
    }
    if (genType === 'classify') {
      await handleGenerateClassify()
      return
    }
    setLoading(true)
    setError(null)
    setQuiz(null)
    setGlossary(null)
    setStreamProgress({ current: 0, total: count })
    setStreamingQuestions([])
    setStreamMeta(null)
    persistKeys()
    const controller = new AbortController()
    abortRef.current = controller

    const callbacks: StreamCallbacks = {
      onMeta: (meta) => {
        setStreamMeta(meta)
      },
      onQuestion: (question, index) => {
        setStreamingQuestions((prev) => [...prev, question])
        setStreamProgress((prev) => prev ? { ...prev, current: index + 1 } : null)
      },
      onDone: (result) => {
        setQuiz(result.quiz)
        setUsedModel(result.model)
        setActiveTab('edit')
        setStreamProgress(null)
        setStreamingQuestions([])
        setStreamMeta(null)
        setLoading(false)
        abortRef.current = null
      },
      onError: (err) => {
        setError(err.message)
        setStreamProgress(null)
        setStreamingQuestions([])
        setStreamMeta(null)
        setLoading(false)
        abortRef.current = null
      },
    }

    try {
      await generateQuizStream(
        buildSettings(),
        subject.trim(),
        count,
        category,
        subcategory,
        callbacks,
        controller.signal,
        quizContext,
        genType
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — already cleaned up in handleCancel
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong while generating the quiz.')
    } finally {
      setLoading(false)
      setStreamProgress(null)
      setStreamingQuestions([])
      setStreamMeta(null)
      abortRef.current = null
    }
  }

  const handleImportJson = () => {
    setImportError(null)
    try {
      const imported = parseQuizJson(importJson)
      setQuiz(imported)
      setUsedModel('')
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
    if (glossary) {
      const { id, name, description, category, subcategory, color, icon } = meta
      setGlossary((prev) =>
        prev
          ? {
              ...prev,
              ...(id !== undefined ? { id } : {}),
              ...(name !== undefined ? { name } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(category !== undefined ? { category } : {}),
              subcategory: subcategory || undefined,
              ...(color !== undefined ? { color } : {}),
              ...(icon !== undefined ? { icon } : {}),
            }
          : prev
      )
      setActiveTab('edit')
      return
    }
    setQuiz((prev) => (prev ? { ...prev, ...meta } : prev))
    setActiveTab('edit')
  }

  const handleUpdateQuestion = (index: number, question: Question) => {
    setQuiz((prev) => {
      if (!prev) return prev
      const questions = [...prev.questions]
      questions[index] = question
      return { ...prev, questions }
    })
  }

  const handleRegenerateQuestion = async (index: number, instructions?: string) => {
    if (!quiz || regeneratingIndices.has(index)) return
    setRegeneratingIndices((prev) => new Set(prev).add(index))
    setRegenErrors((prev) => {
      if (!(index in prev)) return prev
      const next = { ...prev }
      delete next[index]
      return next
    })
    try {
      const result = await regenerateQuestion(buildSettings(), quiz, index, instructions)
      setQuiz((prev) => {
        if (!prev) return prev
        const questions = [...prev.questions]
        questions[index] = result.question
        return { ...prev, questions }
      })
    } catch (err) {
      setRegenErrors((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : 'Failed to regenerate the question.',
      }))
    } finally {
      setRegeneratingIndices((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  const handleDownload = () => {
    if (!dataFile) return
    const fileId = glossary?.id ?? quiz?.id
    if (!fileId) return
    const blob = new Blob([JSON.stringify(dataFile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveLocal = async () => {
    const id = glossary?.id ?? quiz?.id
    if (!dataFile || !id) return

    if (REPO_MODE) {
      const kind = glossary ? 'glossary' : quiz?.type === 'classify' ? 'classify' : 'quiz'
      try {
        const res = await fetch('/api/save-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id, data: dataFile }),
        })
        if (!res.ok) throw new Error(await res.text())
      } catch (err) {
        console.error('Repo save failed', err)
        setSaveError(true)
        setTimeout(() => setSaveError(false), 2000)
        return
      }
    } else if (glossary) {
      saveLocalGlossary(glossary)
    } else {
      saveLocalQuiz(quiz!)
    }

    setSavedLocally(true)
    setTimeout(() => setSavedLocally(false), 2000)
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

      <div className={`grid grid-cols-2 gap-2 p-1 mb-6 border-2 rounded-xl border-plum-200 bg-plum-50/50 dark:border-plum-900/60 dark:bg-stone-900 ${editMode ? '' : 'sm:grid-cols-4'}`}>
        {!editMode && (
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
        )}
        <button
          type="button"
          onClick={() => (quiz || glossary) && setActiveTab('meta')}
          disabled={!quiz && !glossary}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-lg disabled:cursor-not-allowed disabled:opacity-50 ${
            activeTab === 'meta'
              ? 'bg-plum-600 text-white'
              : 'text-plum-700 hover:bg-plum-100 dark:text-plum-300 dark:hover:bg-stone-800'
          }`}
        >
          <FaSlidersH /> {editMode ? 'Meta Edit' : '2. Meta Edit'}
        </button>
        <button
          type="button"
          onClick={() => (quiz || glossary) && setActiveTab('edit')}
          disabled={!quiz && !glossary}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-lg disabled:cursor-not-allowed disabled:opacity-50 ${
            activeTab === 'edit'
              ? 'bg-plum-600 text-white'
              : 'text-plum-700 hover:bg-plum-100 dark:text-plum-300 dark:hover:bg-stone-800'
          }`}
        >
          <FaPen /> {editMode ? 'Edit' : '3. Edit'}
        </button>
        {!editMode && (
        <button
          type="button"
          onClick={() => quiz && setActiveTab('test')}
          disabled={!quiz}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors rounded-lg disabled:cursor-not-allowed disabled:opacity-50 ${
            activeTab === 'test'
              ? 'bg-plum-600 text-white'
              : 'text-plum-700 hover:bg-plum-100 dark:text-plum-300 dark:hover:bg-stone-800'
          }`}
        >
          <FaClipboardCheck /> 4. Test
        </button>
        )}
      </div>

      <div className={`p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 ${activeTab === 'generate' ? '' : 'hidden'}`}>
        <div className="mb-5">
          <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Content type
          </label>
          <select
            value={genType}
            onChange={(e) => setGenType(e.target.value as GenType)}
            className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          >
            <option value="options">Multiple choice</option>
            <option value="bool">True / False</option>
            <option value="classify">Classify</option>
            <option value="glossary">Glossary</option>
          </select>
        </div>

        <div className="grid gap-4 mb-5 sm:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Model provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Temperature
              </label>
              <span className="relative group" tabIndex={0} aria-label="What is temperature?">
                <FaInfoCircle className="text-sm cursor-help text-stone-400 group-hover:text-plum-600 group-focus:text-plum-600 dark:group-hover:text-plum-400 dark:group-focus:text-plum-400" />
                <span className="absolute left-0 z-10 hidden w-64 p-3 mb-2 text-xs font-normal border-2 rounded-lg bottom-full group-hover:block group-focus:block border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  Controls how random the model&apos;s output is. Lower values (0–0.5) give
                  focused, predictable questions; higher values (1–2) give more varied and
                  creative ones, but with a higher chance of odd or off-topic results. 0.8 is
                  a good balance.
                </span>
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            />
          </div>
        </div>

        {provider === 'openrouter' && (
          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Model
            </label>
            <select
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value)}
              disabled={modelsLoading}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white disabled:opacity-60"
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
          </div>
        )}

        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          {providerLabel} API key
        </label>
        <div className="relative mb-1">
          <FaKey className="absolute -translate-y-1/2 pointer-events-none text-stone-400 left-4 top-1/2" aria-hidden />
          <input
            type={showApiKey ? 'text' : 'password'}
            value={activeKey}
            onChange={(e) => setActiveKey(e.target.value)}
            placeholder={`Paste your ${providerLabel} API key`}
            autoComplete="off"
            className="w-full py-3 pl-12 pr-12 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute flex items-center justify-center -translate-y-1/2 rounded-md text-stone-400 right-2 top-1/2 h-9 w-9 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label={showApiKey ? `Hide ${providerLabel} API key` : `Show ${providerLabel} API key`}
          >
            {showApiKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <p className="mb-5 text-xs text-stone-500 dark:text-stone-400">
          Stored only in this browser. Get one at{' '}
          {provider === 'openrouter' ? (
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-plum-600 dark:text-plum-400 hover:underline"
            >
              openrouter.ai/keys
            </a>
          ) : (
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-plum-600 dark:text-plum-400 hover:underline"
            >
              Google AI Studio
            </a>
          )}
          .
        </p>

        <div className="grid gap-4 mb-5 sm:grid-cols-3">
          <div>
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Subcategory
            </label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-4 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
            >
              <option value="">Auto</option>
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              {countLabel}
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
        </div>

        <label className="block mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
          Quiz subject
        </label>
        <textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          rows={3}
          placeholder="e.g. The fall of the Roman Empire, React hooks, basics of organic chemistry..."
          className="w-full px-4 py-3 mb-2 text-sm border-2 rounded-lg resize-y min-h-24 border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
        />
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          polimind automatically adds the formatting instructions so the output works as a playable quiz.
        </p>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowContextModal(true)}
            className="flex items-center justify-center w-full gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800"
          >
            <FaLayerGroup />
            {referenceIds.length > 0
              ? `${referenceIds.length} ${referenceIds.length === 1 ? 'quiz' : 'quizzes'} as reference`
              : 'Add Special Context'}
          </button>
          {referenceIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Their questions are included as context to guide what the generated quiz covers.
              </p>
              <button
                type="button"
                onClick={handleClearContext}
                className="flex-shrink-0 text-xs font-semibold transition-colors text-clay-600 hover:text-clay-700 dark:text-clay-400 dark:hover:text-clay-300"
              >
                Clear
              </button>
            </div>
          )}
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
          {loading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 active:bg-red-800"
            >
              <FaStop /> Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaWandMagicSparkles /> Generate quiz
            </button>
          )}
        </div>

        {loading && streamProgress && (
          <div className="mt-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <FaSpinner className="animate-spin text-plum-500" />
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                {streamProgress.current === 0
                  ? 'Starting generation...'
                  : `Building question ${streamProgress.current} of ${streamProgress.total}...`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-plum-500 to-plum-400"
                style={{ width: `${Math.max(2, (streamProgress.current / streamProgress.total) * 100)}%` }}
              />
            </div>

            {streamMeta?.name && (
              <p className="mt-3 text-sm font-semibold text-stone-800 dark:text-white">
                {streamMeta.name}
              </p>
            )}
            {streamMeta?.description && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {streamMeta.description}
              </p>
            )}

            {streamingQuestions.length > 0 && (
              <div className="mt-4 space-y-2">
                {streamingQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="p-3 border-2 rounded-lg animate-fade-in border-plum-100 bg-plum-50/40 dark:border-plum-900/40 dark:bg-stone-800/60"
                  >
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      <span className="text-plum-600 dark:text-plum-400">{i + 1}.</span> {q.question}
                    </p>
                    {'options' in q ? (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((option, oi) => (
                          <li
                            key={oi}
                            className={`flex items-start gap-2 text-xs ${
                              oi === q.correctAnswer
                                ? 'font-semibold text-green-700 dark:text-green-400'
                                : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            {oi === q.correctAnswer ? (
                              <FaCheck className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <span className="flex-shrink-0 w-3" aria-hidden />
                            )}
                            {option}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-green-700 dark:text-green-400">
                        {'result' in q && q.result ? 'True' : 'False'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

      {glossary && activeTab === 'meta' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <FaSlidersH className="text-plum-500" aria-hidden />
            <h2 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-2xl">
              Glossary Metadata
            </h2>
          </div>

          {usedModel && (
            <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
              Generated with {usedModel}
            </p>
          )}

          <MetaEditor
            quiz={{ ...glossary, tags: [], questions: [] } as QuizMetadata}
            onSave={handleSaveMeta}
            onCancel={() => setActiveTab('edit')}
            variant="glossary"
          />
        </div>
      )}

      {glossary && activeTab === 'edit' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl">
              {glossary.name}
            </h2>
            <span className="flex-shrink-0 text-sm font-semibold text-plum-600 dark:text-plum-400">
              {glossary.groups.reduce((sum, g) => sum + g.group.length, 0)} terms
            </span>
          </div>

          {usedModel && (
            <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
              Generated with {usedModel}
            </p>
          )}

          {glossary.description && (
            <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">{glossary.description}</p>
          )}

          <GlossaryEditor
            key={glossary.id}
            glossary={glossary}
            onChange={setGlossary}
            onRegenerateAll={handleGenerateGlossary}
            regenerating={loading}
            onAskTerm={handleAskTerm}
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
              onClick={() => setActiveTab('meta')}
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800"
            >
              <FaSlidersH /> Back to Meta Edit
            </button>
            <button
              type="button"
              onClick={handleSaveLocal}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              {savedLocally ? (
                <>
                  <FaCheck /> Saved!
                </>
              ) : saveError ? (
                <>
                  <FaSave /> Save failed
                </>
              ) : (
                <>
                  <FaSave /> {REPO_MODE ? 'Save to Repo' : 'Save to Local Storage'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              <FaDownload /> Download
            </button>
          </div>
        </div>
      )}

      {quiz && activeTab === 'meta' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <FaSlidersH className="text-plum-500" aria-hidden />
            <h2 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-2xl">
              Quiz Metadata
            </h2>
          </div>

          {usedModel && (
            <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
              Generated with {usedModel}
            </p>
          )}

          <MetaEditor quiz={quiz} onSave={handleSaveMeta} onCancel={() => setActiveTab('edit')} />
        </div>
      )}

      {quiz && activeTab === 'edit' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl">
              {quiz.name}
            </h2>
            <span className="flex-shrink-0 text-sm font-semibold text-plum-600 dark:text-plum-400">
              {quiz.type === 'classify'
                ? `${quiz.entities?.length ?? 0} entities`
                : `${quiz.questions.length} questions`}
            </span>
          </div>

          {usedModel && (
            <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
              Generated with {usedModel}
            </p>
          )}

          {quiz.description && (
            <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">{quiz.description}</p>
          )}

          {quiz.type === 'classify' ? (
            <ClassifyEditor
              key={quiz.id}
              quiz={quiz}
              onChange={setQuiz}
              onRegenerateEntity={handleRegenerateEntity}
              regeneratingEntities={regeneratingEntities}
              entityErrors={entityErrors}
            />
          ) : (
            <QuestionList
              key={quiz.id}
              quiz={quiz}
              regeneratingIndices={regeneratingIndices}
              errors={regenErrors}
              onRegenerate={handleRegenerateQuestion}
              onUpdateQuestion={handleUpdateQuestion}
            />
          )}

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
              onClick={() => setActiveTab('meta')}
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800"
            >
              <FaSlidersH /> Back to Meta Edit
            </button>
            <button
              type="button"
              onClick={handleSaveLocal}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              {savedLocally ? (
                <>
                  <FaCheck /> Saved!
                </>
              ) : saveError ? (
                <>
                  <FaSave /> Save failed
                </>
              ) : (
                <>
                  <FaSave /> {REPO_MODE ? 'Save to Repo' : 'Save to Local Storage'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              <FaDownload /> Download JSON
            </button>
          </div>
        </div>
      )}

      {quiz && activeTab === 'test' && (
        <div className="p-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FaClipboardCheck className="text-plum-500" aria-hidden />
              <h2 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-2xl">
                Test run
              </h2>
            </div>
            <span className="flex-shrink-0 text-sm font-semibold text-plum-600 dark:text-plum-400">
              {quiz.type === 'classify'
                ? `${classifyPreview?.questions.length ?? 0} questions`
                : `${quiz.questions.length} questions`}
            </span>
          </div>

          {quiz.type === 'classify' ? (
            classifyPreview?.error ? (
              <div className="p-3 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
                {classifyPreview.error}
              </div>
            ) : (
              <QuizTester
                key={quiz.id}
                quiz={{ ...quiz, type: 'options', questions: classifyPreview?.questions ?? [] }}
              />
            )
          ) : (
            <QuizTester key={quiz.id} quiz={quiz} />
          )}

          <div className="flex flex-col gap-3 mt-5 sm:flex-row">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800"
            >
              <FaPen /> Back to editing
            </button>
            <button
              type="button"
              onClick={handleSaveLocal}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              {savedLocally ? (
                <>
                  <FaCheck /> Saved!
                </>
              ) : saveError ? (
                <>
                  <FaSave /> Save failed
                </>
              ) : (
                <>
                  <FaSave /> {REPO_MODE ? 'Save to Repo' : 'Save to Local Storage'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
            >
              <FaDownload /> Download JSON
            </button>
          </div>
        </div>
      )}

      {showContextModal && (
        <ShufflePracticeModal
          subjects={subjects}
          initialSelectedIds={referenceIds}
          title="Add Special Context"
          icon={<FaWandMagicSparkles className="text-plum-500 dark:text-plum-400" aria-hidden />}
          confirmLabel="Done"
          confirmIcon={<FaWandMagicSparkles />}
          showCount={false}
          onClose={() => setShowContextModal(false)}
          onStart={(quizzes) => handleContextConfirm(quizzes)}
        />
      )}
    </div>
  )
}
