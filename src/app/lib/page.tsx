'use client'

import { useState, useEffect, useMemo } from 'react'
import GlossaryCard from '@/components/GlossaryCard'
import { loadGlossaries } from '@/utils/loadGlossaries'
import { CATEGORIES, getCategoryLabel } from '@/data/categories'
import type { GlossaryMeta } from '@/types/glossary'

export default function LibPage() {
  const [glossaries, setGlossaries] = useState<GlossaryMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      const data = await loadGlossaries()
      setGlossaries(data)
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const present = new Set(glossaries.map((g) => g.category))
    return CATEGORIES.map((c) => c.id).filter((id) => present.has(id))
  }, [glossaries])

  const filtered = useMemo(
    () =>
      glossaries.filter(
        (g) => selectedCategory === 'all' || g.category === selectedCategory
      ),
    [glossaries, selectedCategory]
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="mt-4 mb-2 text-3xl font-bold tracking-wide font-display sm:text-4xl md:text-5xl">
          Library
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          Browse glossaries and brush up on the key terms.
        </p>
      </div>

      {!loading && glossaries.length > 0 && (
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
              Loading library...
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-xl font-bold text-stone-600 dark:text-stone-300 sm:text-2xl">
            No glossaries yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((glossary, index) => (
            <GlossaryCard key={glossary.id} glossary={glossary} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
