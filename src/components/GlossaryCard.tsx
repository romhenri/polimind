import type { CSSProperties } from 'react'
import Link from 'next/link'
import { FaArrowRight, FaBookOpen } from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import { getGlossaryIcon } from '@/utils/glossaryIcons'
import type { GlossaryMeta } from '@/types/glossary'

interface GlossaryCardProps {
  glossary: GlossaryMeta
  index: number
}

export default function GlossaryCard({ glossary, index }: GlossaryCardProps) {
  const bgColor = getColor(glossary.color)
  const Icon = getGlossaryIcon(glossary.id, glossary.category)
  const animationDelay = `${index * 0.1}s`

  return (
    <div
      className="relative flex items-center gap-4 cursor-pointer card card-hover sm:gap-5"
      style={{ animationDelay, '--qc': bgColor } as CSSProperties}
    >
      <Link
        href={`/lib/${glossary.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Open glossary: ${glossary.name}`}
      />
      <div
        className="relative z-10 inline-flex items-center justify-center text-white shrink-0 w-14 h-14 rounded-xl sm:w-16 sm:h-16 pointer-events-none"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="text-2xl sm:text-3xl" aria-hidden />
      </div>

      <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
        <h3 className="text-lg font-bold tracking-wide truncate font-display text-stone-800 dark:text-white sm:text-xl">
          {glossary.name}
        </h3>
        <p className="font-medium text-stone-700 dark:text-stone-200 line-clamp-1 sm:line-clamp-2">
          {glossary.description}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
          <FaBookOpen />
          <span>{glossary.termCount} terms</span>
        </div>
      </div>

      <FaArrowRight className="relative z-10 shrink-0 quiz-accent pointer-events-none" aria-hidden />
    </div>
  )
}
