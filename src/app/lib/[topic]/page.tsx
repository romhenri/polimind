'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import TermCard from '@/components/TermCard'
import { fetchGlossary } from '@/utils/loadGlossaries'
import { getColor } from '@/utils/colorMapper'
import { getGlossaryIcon } from '@/utils/glossaryIcons'
import type { Glossary } from '@/types/glossary'
import type { CSSProperties } from 'react'

export default function GlossaryDetailPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic } = use(params)
  const [glossary, setGlossary] = useState<Glossary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await fetchGlossary(topic)
      setGlossary(data)
      setLoading(false)
    }
    load()
  }, [topic])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-16 h-16 border-b-2 rounded-full border-clay-500 animate-spin"></div>
      </div>
    )
  }

  if (!glossary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center card">
          <p className="mb-4 text-base text-stone-600 dark:text-stone-300 sm:text-lg">
            Glossary not found.
          </p>
          <Link href="/lib" className="inline-block btn-primary">
            Back to Library
          </Link>
        </div>
      </div>
    )
  }

  const bgColor = getColor(glossary.color)
  const Icon = getGlossaryIcon(glossary.id, glossary.category)

  return (
    <div className="animate-fade-in" style={{ '--qc': bgColor } as CSSProperties}>
      <Link
        href="/lib"
        className="inline-flex items-center gap-2 mb-4 font-semibold text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
      >
        <FaArrowLeft /> Library
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div
            className="inline-flex items-center justify-center text-white w-14 h-14 rounded-xl sm:w-16 sm:h-16 shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="text-2xl sm:text-3xl" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
              {glossary.name}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-300 sm:text-base">
              {glossary.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {glossary.terms.map((term, index) => (
          <TermCard key={term.term} term={term} bgColor={bgColor} index={index} />
        ))}
      </div>
    </div>
  )
}
