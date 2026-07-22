'use client'

import { useState, useEffect, useMemo } from 'react'
import TrailCard from '@/components/TrailCard'
import { TRAILS } from '@/data/trails'
import { loadQuizzesBySlugs, type LoadedQuiz } from '@/utils/loadQuizzes'
import { useProfile } from '@/contexts/ProfileContext'
import { getCategoryLabel } from '@/data/categories'

export default function TrailsPage() {
  const { completedQuizzes } = useProfile()
  const [quizzes, setQuizzes] = useState<Record<string, LoadedQuiz>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      const allSlugs = TRAILS.flatMap((trail) => trail.quizzes)
      const map = await loadQuizzesBySlugs(allSlugs)
      setQuizzes(map)
      setLoading(false)
    }
    load()
  }, [])

  const completedSet = useMemo(
    () => new Set(Object.values(completedQuizzes).flat()),
    [completedQuizzes]
  )

  const categories = useMemo(() => {
    const cats = Array.from(new Set(TRAILS.map((t) => t.category)))
    return cats.sort()
  }, [])

  const trailStats = useMemo(
    () =>
      TRAILS.map((trail) => {
        const existing = trail.quizzes.filter((slug) => quizzes[slug])
        const totalQuestions = existing.reduce(
          (sum, slug) => sum + quizzes[slug].questions,
          0
        )
        const completedCount = existing.filter((slug) =>
          completedSet.has(slug)
        ).length
        return {
          trail,
          totalQuestions,
          quizCount: existing.length,
          completedCount,
        }
      }),
    [quizzes, completedSet]
  )

  const filtered = useMemo(
    () =>
      trailStats.filter(
        ({ trail }) =>
          selectedCategory === 'all' || trail.category === selectedCategory
      ),
    [trailStats, selectedCategory]
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="mt-4 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          Learning trails
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          Follow a curated path and track how far you&apos;ve come.
        </p>
      </div>

      {!loading && (
        <div className="mb-6">
          <div className="flex gap-6 px-4 -mx-4 overflow-x-auto border-b flex-nowrap border-stone-200 dark:border-stone-700 sm:mx-0 sm:px-0 sm:justify-center sm:overflow-visible">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${selectedCategory === 'all'
                ? 'border-clay-500 text-clay-600 dark:text-clay-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${selectedCategory === category
                  ? 'border-clay-500 text-clay-600 dark:text-clay-400'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-b-2 rounded-full border-clay-500 animate-spin"></div>
            <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg">
              Loading trails...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ trail, totalQuestions, quizCount, completedCount }, index) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              totalQuestions={totalQuestions}
              quizCount={quizCount}
              completedCount={completedCount}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
