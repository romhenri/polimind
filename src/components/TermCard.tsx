import type { CSSProperties } from 'react'
import RichText from '@/components/RichText'
import type { GlossaryTerm } from '@/types/glossary'

interface TermCardProps {
  term: GlossaryTerm
  bgColor: string
  index: number
}

export default function TermCard({ term, bgColor, index }: TermCardProps) {
  const animationDelay = `${index * 0.05}s`

  return (
    <div
      className="flex flex-col h-full card"
      style={{ animationDelay, '--qc': bgColor } as CSSProperties}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: bgColor }}
          aria-hidden
        />
        <h3 className="text-lg font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-xl">
          {term.term}
        </h3>
      </div>
      <p className="font-medium text-stone-700 dark:text-stone-200">
        <RichText>{term.definition}</RichText>
      </p>
    </div>
  )
}
