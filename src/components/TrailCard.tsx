import type { CSSProperties } from 'react'
import Link from 'next/link'
import { FaArrowRight, FaQuestionCircle, FaLayerGroup } from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import type { Trail } from '@/data/trails'

interface TrailCardProps {
  trail: Trail
  totalQuestions: number
  quizCount: number
  completedCount: number
  index: number
}

export default function TrailCard({
  trail,
  totalQuestions,
  quizCount,
  completedCount,
  index,
}: TrailCardProps) {
  const bgColor = getColor(trail.color)
  const Icon = trail.icon
  const percent = quizCount > 0 ? Math.round((completedCount / quizCount) * 100) : 0
  const animationDelay = `${index * 0.1}s`

  return (
    <div
      className="relative flex flex-col justify-between h-full cursor-pointer card card-hover"
      style={{ animationDelay, '--qc': bgColor } as CSSProperties}
    >
      <Link
        href={`/trails/${trail.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Open trail: ${trail.name}`}
      />
      <div className="relative z-10 flex flex-col justify-between flex-1 min-h-0 pointer-events-none">
        <div>
          <div className="mb-4">
            <div
              className="inline-flex items-center justify-center mb-3 text-white w-14 h-14 rounded-xl sm:w-16 sm:h-16"
              style={{ backgroundColor: bgColor }}
            >
              <Icon className="text-2xl sm:text-3xl" aria-hidden />
            </div>
            <h3 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-2xl">
              {trail.name}
            </h3>
          </div>

          <p className="mb-4 font-medium text-stone-700 dark:text-stone-200 line-clamp-2">
            {trail.description}
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
            <span className="font-semibold quiz-accent">{percent}% complete</span>
            <span>
              {completedCount}/{quizCount} quizzes
            </span>
          </div>
          <div className="h-2 mb-4 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${percent}%`, backgroundColor: bgColor }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
              <span className="flex items-center gap-2">
                <FaLayerGroup />
                {quizCount}
              </span>
              <span className="flex items-center gap-2">
                <FaQuestionCircle />
                {totalQuestions}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold quiz-accent">
              Explore
              <FaArrowRight />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
