'use client'

import { useEffect, useMemo, useState } from 'react'
import { FaTimes, FaRandom } from 'react-icons/fa'
import { QuizListing } from '@/types/quiz'
import { CATEGORIES, getCategoryById } from '@/data/categories'

const COUNT_OPTIONS = [5, 10, 20, 30]
const DEFAULT_COUNT = 10
const OTHER_GROUP = 'Other'
const ALL_TAB = 'all'
const MIXED_CATEGORY = 'mixed'

interface ShufflePracticeModalProps {
  subjects: QuizListing[]
  onClose: () => void
  onStart: (quizzes: QuizListing[], count: number, category: string) => void
}

export default function ShufflePracticeModal({
  subjects,
  onClose,
  onStart,
}: ShufflePracticeModalProps) {
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [count, setCount] = useState<number>(DEFAULT_COUNT)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const tabs = useMemo(() => {
    const available = CATEGORIES.filter((c) => subjects.some((s) => s.category === c.id))
    return [{ id: ALL_TAB, label: 'All' }, ...available.map((c) => ({ id: c.id, label: c.label }))]
  }, [subjects])

  const tabQuizzes = useMemo(
    () => (activeTab === ALL_TAB ? subjects : subjects.filter((s) => s.category === activeTab)),
    [subjects, activeTab]
  )

  const groups = useMemo(() => {
    const byGroup = new Map<string, QuizListing[]>()
    const push = (key: string, quiz: QuizListing) => {
      const list = byGroup.get(key) ?? []
      list.push(quiz)
      byGroup.set(key, list)
    }

    let order: string[]
    if (activeTab === ALL_TAB) {
      const known = new Map(CATEGORIES.map((c) => [c.id, c.label]))
      order = [...CATEGORIES.map((c) => c.label), OTHER_GROUP]
      for (const quiz of tabQuizzes) push(known.get(quiz.category ?? '') ?? OTHER_GROUP, quiz)
    } else {
      const known = getCategoryById(activeTab)?.subcategories ?? []
      order = [...known, OTHER_GROUP]
      for (const quiz of tabQuizzes) {
        push(quiz.subcategory && known.includes(quiz.subcategory) ? quiz.subcategory : OTHER_GROUP, quiz)
      }
    }

    return order
      .filter((g) => byGroup.has(g))
      .map((g) => ({ name: g, quizzes: byGroup.get(g)! }))
  }, [tabQuizzes, activeTab])

  const selectedQuizzes = useMemo(
    () => subjects.filter((q) => selectedIds.has(q.id)),
    [subjects, selectedIds]
  )
  const totalAvailable = useMemo(
    () => selectedQuizzes.reduce((sum, q) => sum + q.questions, 0),
    [selectedQuizzes]
  )
  const runLength = Math.min(count, totalAvailable)

  const selectedPerTab = useMemo(() => {
    const counts = new Map<string, number>([[ALL_TAB, selectedQuizzes.length]])
    for (const quiz of selectedQuizzes) {
      const key = quiz.category ?? ''
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [selectedQuizzes])

  const resolvedCategory = useMemo(() => {
    const categories = new Set(selectedQuizzes.map((q) => q.category ?? MIXED_CATEGORY))
    return categories.size === 1 ? [...categories][0] : MIXED_CATEGORY
  }, [selectedQuizzes])

  const toggleQuiz = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isGroupSelected = (quizzes: QuizListing[]) =>
    quizzes.length > 0 && quizzes.every((q) => selectedIds.has(q.id))

  const toggleGroup = (quizzes: QuizListing[]) => {
    const ids = quizzes.map((q) => q.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (ids.every((id) => next.has(id))) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const canStart = selectedQuizzes.length > 0 && totalAvailable > 0

  const handleStart = () => {
    if (!canStart) return
    onStart(selectedQuizzes, count, resolvedCategory)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-2 border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <FaRandom className="text-clay-500 dark:text-clay-400" aria-hidden />
            <h2 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white">
              Shuffle Practice
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center transition-colors rounded-md h-9 w-9 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="flex gap-6 px-5 overflow-x-auto border-b flex-nowrap border-stone-200 dark:border-stone-700">
          {tabs.map((tab) => {
            const selectedHere = selectedPerTab.get(tab.id) ?? 0
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-stone-400 text-stone-800 dark:border-stone-500 dark:text-stone-100'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {tab.label}
                {selectedHere > 0 && (
                  <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-white/[0.12] dark:text-stone-300">
                    {selectedHere}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex-1 px-5 py-4 overflow-y-auto">
          {tabQuizzes.length === 0 ? (
            <p className="py-8 text-sm text-center text-stone-500 dark:text-stone-400">
              No quizzes in this category yet.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500">
                  {selectedQuizzes.length} selected
                  {selectedQuizzes.length > 0 && ` · ${totalAvailable} questions`}
                </span>
                {selectedQuizzes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-semibold transition-colors text-clay-600 hover:text-clay-700 dark:text-clay-400 dark:hover:text-clay-300"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.name}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {group.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.quizzes)}
                        className="text-xs font-semibold transition-colors text-clay-600 hover:text-clay-700 dark:text-clay-400 dark:hover:text-clay-300"
                      >
                        {isGroupSelected(group.quizzes) ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {group.quizzes.map((quiz) => {
                        const checked = selectedIds.has(quiz.id)
                        return (
                          <label
                            key={quiz.id}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 px-3 py-2.5 transition-colors ${
                              checked
                                ? 'border-stone-300 bg-black/[0.04] dark:border-stone-600 dark:bg-white/[0.06]'
                                : 'border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600'
                            }`}
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQuiz(quiz.id)}
                                className="w-4 h-4 accent-clay-500"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium truncate text-stone-800 dark:text-stone-100">
                                  {quiz.name}
                                </span>
                                {activeTab === ALL_TAB && quiz.subcategory && (
                                  <span className="block text-xs truncate text-stone-400 dark:text-stone-500">
                                    {quiz.subcategory}
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="flex-shrink-0 text-xs text-stone-400 dark:text-stone-500">
                              {quiz.questions} Q
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t-2 border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">
              Questions
            </span>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCount(option)}
                  className={`h-8 w-10 rounded-md text-sm font-semibold transition-colors ${
                    count === option
                      ? 'bg-black/[0.08] text-stone-800 ring-1 ring-stone-300 dark:bg-white/[0.12] dark:text-white dark:ring-stone-600'
                      : 'bg-black/[0.04] text-stone-500 hover:bg-black/[0.08] dark:bg-white/[0.04] dark:text-stone-400 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {canStart
                ? `Playing ${runLength} of ${totalAvailable} questions`
                : 'Select at least one quiz'}
            </span>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="flex items-center gap-2 btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaRandom />
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
