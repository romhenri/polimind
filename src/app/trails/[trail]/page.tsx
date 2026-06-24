'use client'

import { useState, useEffect, useMemo, use } from 'react'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import SubjectCard from '@/components/SubjectCard'
import { getTrail } from '@/data/trails'
import { getColor } from '@/utils/colorMapper'
import { loadQuizzesBySlugs, type LoadedQuiz } from '@/utils/loadQuizzes'
import { useProfile } from '@/contexts/ProfileContext'
import type { CSSProperties } from 'react'

export default function TrailDetailPage({
  params,
}: {
  params: Promise<{ trail: string }>
}) {
  const { trail: trailId } = use(params)
  const trail = getTrail(trailId)
  const { completedQuizzes } = useProfile()
  const [quizzes, setQuizzes] = useState<Record<string, LoadedQuiz>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trail) {
      setLoading(false)
      return
    }
    const load = async () => {
      const map = await loadQuizzesBySlugs(trail.quizzes)
      setQuizzes(map)
      setLoading(false)
    }
    load()
  }, [trail])

  const completedSet = useMemo(
    () => new Set(Object.values(completedQuizzes).flat()),
    [completedQuizzes]
  )

  const orderedQuizzes = useMemo(
    () => (trail ? trail.quizzes.map((slug) => quizzes[slug]).filter(Boolean) : []),
    [trail, quizzes]
  )

  const completedCount = orderedQuizzes.filter((q) => completedSet.has(q.id)).length
  const totalQuestions = orderedQuizzes.reduce((sum, q) => sum + q.questions, 0)
  const percent =
    orderedQuizzes.length > 0
      ? Math.round((completedCount / orderedQuizzes.length) * 100)
      : 0

  if (!trail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center card">
          <p className="mb-4 text-base text-stone-600 dark:text-stone-300 sm:text-lg">
            Trail not found.
          </p>
          <Link href="/trails" className="inline-block btn-primary">
            Back to Trails
          </Link>
        </div>
      </div>
    )
  }

  const bgColor = getColor(trail.color)
  const Icon = trail.icon

  return (
    <div className="animate-fade-in" style={{ '--qc': bgColor } as CSSProperties}>
      <Link
        href="/trails"
        className="inline-flex items-center gap-2 mb-4 font-semibold text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
      >
        <FaArrowLeft /> Trails
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="inline-flex items-center justify-center text-white w-14 h-14 rounded-xl sm:w-16 sm:h-16 shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="text-2xl sm:text-3xl" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
              {trail.name}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-300 sm:text-base">
              {trail.description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1.5 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
          <span className="font-semibold quiz-accent">{percent}% complete</span>
          <span>
            {completedCount}/{orderedQuizzes.length} quizzes · {totalQuestions} questions
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full sm:h-3 bg-stone-200 dark:bg-stone-700">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: bgColor }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-16 h-16 border-b-2 rounded-full border-clay-500 animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orderedQuizzes.map((quiz, index) => (
            <SubjectCard
              key={quiz.id}
              subject={quiz}
              index={index}
              completed={completedSet.has(quiz.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
