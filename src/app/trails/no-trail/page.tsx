'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa6'
import SubjectCard from '@/components/SubjectCard'
import { TRAILS } from '@/data/trails'
import { loadQuizzesBySlugs, type LoadedQuiz } from '@/utils/loadQuizzes'

export default function NoTrailQuizzesPage() {
  const [quizzes, setQuizzes] = useState<LoadedQuiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/quiz-slugs', { cache: 'no-store' })
      const { slugs } = (await res.json()) as { slugs: string[] }
      const trailSlugs = new Set(TRAILS.flatMap((trail) => trail.quizzes))
      const orphanSlugs = slugs.filter((slug) => !trailSlugs.has(slug))
      const map = await loadQuizzesBySlugs(orphanSlugs)
      setQuizzes(orphanSlugs.map((slug) => map[slug]).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [])

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => a.name.localeCompare(b.name)),
    [quizzes]
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <Link
          href="/trails"
          className="inline-flex items-center gap-2 mb-4 text-sm font-medium text-stone-500 hover:underline dark:text-stone-400"
        >
          <FaArrowLeft className="text-xs" />
          Back to trails
        </Link>
        <h1 className="mt-2 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          Quizzes without a trail
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          These quizzes haven&apos;t been grouped into a trail yet.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-b-2 rounded-full border-clay-500 animate-spin"></div>
            <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg">
              Loading quizzes...
            </p>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-xl font-bold text-stone-600 dark:text-stone-300 sm:text-2xl">
            Every quiz belongs to a trail.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((quiz, index) => (
            <SubjectCard key={quiz.id} subject={quiz} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
