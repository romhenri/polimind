'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaArrowRight,
  FaQuestionCircle,
  FaLayerGroup,
  FaCheck,
  FaPen,
  FaSave,
  FaTrashAlt,
  FaCopy,
  FaLink,
  FaDownload,
} from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import { getQuizIcon } from '@/utils/iconMapper'
import { downloadLocalQuiz } from '@/utils/localQuizzes'
import type { QuizType } from '@/types/quiz'

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
    type?: QuizType
  }
  index: number
  onTagClick?: (tag: string) => void
  completed?: boolean
  isLocal?: boolean
  onDeleteLocal?: () => void
}

export default function SubjectCard({ subject, index, onTagClick, completed, isLocal, onDeleteLocal }: SubjectCardProps) {
  const router = useRouter()
  const bgColor = getColor(subject.color)
  const Icon = getQuizIcon(subject.icon, subject.category)
  const animationDelay = `${index * 0.1}s`
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const menuItemCount = 3 + (isLocal ? 1 : 0) + (isLocal && onDeleteLocal ? 1 : 0)

  const handleContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    const menuWidth = 176
    const menuHeight = menuItemCount * 36 + 8
    setMenu({
      x: Math.min(e.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(e.clientY, window.innerHeight - menuHeight - 8),
    })
  }

  const handleEdit = () => {
    setMenu(null)
    router.push(`/ai?edit=${subject.id}`)
  }

  const handleDelete = () => {
    setMenu(null)
    if (window.confirm(`Delete the local quiz "${subject.name}"? This cannot be undone.`)) {
      onDeleteLocal?.()
    }
  }

  const handleCopyName = async () => {
    setMenu(null)
    await navigator.clipboard.writeText(subject.name)
  }

  const handleCopyLink = async () => {
    setMenu(null)
    await navigator.clipboard.writeText(`${window.location.origin}/quiz/${subject.id}`)
  }

  const handleDownload = async () => {
    setMenu(null)
    await downloadLocalQuiz(subject.id)
  }

  return (
    <div
      className="relative flex flex-col justify-between h-full cursor-pointer card card-hover"
      style={{ animationDelay, '--qc': bgColor } as CSSProperties}
      onContextMenu={handleContextMenu}
    >
      <Link
        href={`/quiz/${subject.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Start quiz: ${subject.name}`}
      />
      {completed && (
        <div
          className="absolute z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white rounded-full pointer-events-none top-4 right-4"
          style={{ backgroundColor: bgColor }}
        >
          <FaCheck aria-hidden />
          Complete
        </div>
      )}
      {isLocal && (
        <div
          className={`absolute z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full pointer-events-none right-4 bg-black/[0.55] text-white dark:bg-white/[0.15] dark:text-stone-100 ${completed ? 'top-14' : 'top-4'}`}
        >
          <FaSave aria-hidden />
          Local
        </div>
      )}
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
                  className="px-2 py-1 text-xs font-semibold transition-colors rounded-md whitespace-nowrap quiz-tag quiz-tag-interactive quiz-accent"
                >
                  {tag}
                </button>
              ) : (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap quiz-tag quiz-accent"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
            {subject.type === 'classify' ? <FaLayerGroup /> : <FaQuestionCircle />}
            <span>
              {subject.questions} {subject.type === 'classify' ? 'to classify' : 'questions'}
            </span>
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
          <div className="flex items-center gap-2 font-semibold quiz-accent">
            Start
            <FaArrowRight />
          </div>
        </div>
      </div>

      {menu &&
        createPortal(
          <div
            className="fixed z-50 w-44 py-1 overflow-hidden bg-white border-2 rounded-lg border-stone-200 dark:bg-stone-900 dark:border-stone-700"
            style={{ top: menu.y, left: menu.x }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
            >
              <FaPen className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
              Edit quiz
            </button>
            <button
              type="button"
              onClick={handleCopyName}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
            >
              <FaCopy className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
              Copy quiz name
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
            >
              <FaLink className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
              Copy quiz link
            </button>
            {isLocal && (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
              >
                <FaDownload className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
                Download quiz
              </button>
            )}
            {isLocal && onDeleteLocal && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left text-red-600 transition-colors hover:bg-black/[0.06] dark:text-red-400 dark:hover:bg-white/[0.06]"
              >
                <FaTrashAlt className="text-xs" aria-hidden />
                Delete quiz
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}