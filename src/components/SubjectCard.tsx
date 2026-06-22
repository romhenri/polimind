import Link from 'next/link'
import { FaArrowRight, FaQuestionCircle } from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import { getQuizIcon } from '@/utils/iconMapper'

type Hardness = 'easy' | 'medium' | 'hard'

const DOTS_BY_HARDNESS: Record<Hardness, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

interface SubjectCardProps {
  subject: {
    id: string
    name: string
    description: string
    icon: string
    color: string
    category: string
    questions: number
    tags: string[]
    hardness?: Hardness
  }
  index: number
  onTagClick?: (tag: string) => void
}

export default function SubjectCard({ subject, index, onTagClick }: SubjectCardProps) {
  const bgColor = getColor(subject.color)
  const Icon = getQuizIcon(subject.id, subject.category)
  const animationDelay = `${index * 0.1}s`

  return (
    <div
      className="relative flex flex-col justify-between h-full cursor-pointer card card-hover"
      style={{ animationDelay }}
    >
      <Link
        href={`/quiz/${subject.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Start quiz: ${subject.name}`}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between pointer-events-none">
        <div>
          <div className="mb-4">
            <div
              className="inline-flex items-center justify-center mb-3 text-white w-14 h-14 rounded-xl sm:w-16 sm:h-16"
              style={{ backgroundColor: bgColor }}
            >
              <Icon className="text-2xl sm:text-3xl" aria-hidden />
            </div>
            <h3 className="font-display text-xl font-bold tracking-wide text-stone-800 dark:text-white sm:text-2xl">
              {subject.name}
            </h3>
          </div>

          <p className="mb-3 font-medium text-stone-700 dark:text-stone-200 line-clamp-2">
            {subject.description}
          </p>

          <div
            className={`mb-4 flex flex-nowrap gap-2 overflow-hidden ${onTagClick ? 'pointer-events-auto' : ''}`}
          >
            {subject.tags.map((tag, idx) =>
              onTagClick ? (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onTagClick(tag)
                  }}
                  className="px-2 py-1 text-xs font-semibold transition-colors rounded-md whitespace-nowrap bg-clay-100 text-clay-700 hover:bg-clay-200 dark:bg-clay-900 dark:text-clay-200 dark:hover:bg-clay-800"
                >
                  {tag}
                </button>
              ) : (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap bg-clay-100 text-clay-700 dark:bg-clay-900 dark:text-clay-200"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
            <FaQuestionCircle />
            <span>{subject.questions} questions</span>
            <span className="flex items-center gap-0.5" title={{ easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }[subject.hardness ?? 'easy']}>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full ${i <= DOTS_BY_HARDNESS[subject.hardness ?? 'easy'] ? 'bg-current opacity-100' : 'bg-current opacity-30'}`}
                  aria-hidden
                />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-clay-600 dark:text-clay-400">
            Start
            <FaArrowRight />
          </div>
        </div>
      </div>
    </div>
  )
}