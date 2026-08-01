'use client'

import { useState, useEffect, useMemo } from 'react'
import GlossaryCard from '@/components/GlossaryCard'
import { loadGlossaries } from '@/utils/loadGlossaries'
import { CATEGORIES, getCategoryById, getCategoryLabel } from '@/data/categories'
import type { GlossaryMeta } from '@/types/glossary'

export default function LibPage() {
  const [glossaries, setGlossaries] = useState<GlossaryMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0].id)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const data = await loadGlossaries()
      setGlossaries(data)
      const firstPresent = CATEGORIES.map((c) => c.id).find((id) =>
        data.some((g) => g.category === id)
      )
      if (firstPresent) setSelectedCategory(firstPresent)
      setLoading(false)
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const present = new Set(glossaries.map((g) => g.category))
    return CATEGORIES.map((c) => c.id).filter((id) => present.has(id))
  }, [glossaries])

  const subcategories = useMemo(() => {
    const present = new Set(
      glossaries
        .filter((g) => g.category === selectedCategory && g.subcategory)
        .map((g) => g.subcategory as string)
    )
    return (getCategoryById(selectedCategory)?.subcategories ?? []).filter((s) =>
      present.has(s)
    )
  }, [glossaries, selectedCategory])

  useEffect(() => {
    setSelectedSubcategory(subcategories[0] ?? '')
  }, [subcategories])

  const filtered = useMemo(
    () =>
      glossaries.filter(
        (g) =>
          g.category === selectedCategory &&
          (selectedSubcategory === '' || g.subcategory === selectedSubcategory)
      ),
    [glossaries, selectedCategory, selectedSubcategory]
  )

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category)
  }

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
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleSelectCategory(category)}
                className={`flex-shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${selectedCategory === category
                  ? 'border-clay-500 text-clay-600 dark:text-clay-400'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>

          {subcategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 px-4 mt-4 -mx-4 sm:mx-0 sm:px-0">
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  onClick={() => setSelectedSubcategory(subcategory)}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selectedSubcategory === subcategory
                    ? 'bg-black/[0.1] text-stone-800 dark:bg-white/[0.12] dark:text-stone-100'
                    : 'text-stone-500 hover:bg-black/[0.06] dark:text-stone-400 dark:hover:bg-white/[0.06]'
                    }`}
                >
                  {subcategory}
                </button>
              ))}
            </div>
          )}
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
