'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaArrowRight,
  FaBookOpen,
  FaPen,
  FaCopy,
  FaLink,
  FaDownload,
  FaTrashAlt,
} from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import { getGlossaryIcon } from '@/utils/glossaryIcons'
import { downloadLocalGlossary } from '@/utils/localGlossaries'
import type { GlossaryMeta } from '@/types/glossary'

interface GlossaryCardProps {
  glossary: GlossaryMeta
  index: number
  isLocal?: boolean
  onDeleteLocal?: () => void
}

export default function GlossaryCard({ glossary, index, isLocal, onDeleteLocal }: GlossaryCardProps) {
  const router = useRouter()
  const bgColor = getColor(glossary.color)
  const Icon = getGlossaryIcon(glossary.id, glossary.category)
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
    router.push(`/ai?edit=${glossary.id}&type=glossary`)
  }

  const handleCopyName = async () => {
    setMenu(null)
    await navigator.clipboard.writeText(glossary.name)
  }

  const handleCopyLink = async () => {
    setMenu(null)
    await navigator.clipboard.writeText(`${window.location.origin}/lib/${glossary.id}`)
  }

  const handleDownload = async () => {
    setMenu(null)
    await downloadLocalGlossary(glossary.id)
  }

  const handleDelete = () => {
    setMenu(null)
    if (window.confirm(`Delete the local glossary "${glossary.name}"? This cannot be undone.`)) {
      onDeleteLocal?.()
    }
  }

  return (
    <div
      className="relative flex items-center gap-4 cursor-pointer card card-hover sm:gap-5"
      style={{ animationDelay, '--qc': bgColor } as CSSProperties}
      onContextMenu={handleContextMenu}
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
              Edit glossary
            </button>
            <button
              type="button"
              onClick={handleCopyName}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
            >
              <FaCopy className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
              Copy glossary name
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
            >
              <FaLink className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
              Copy glossary link
            </button>
            {isLocal && (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left transition-colors text-stone-700 hover:bg-black/[0.06] dark:text-stone-200 dark:hover:bg-white/[0.06]"
              >
                <FaDownload className="text-xs text-stone-500 dark:text-stone-400" aria-hidden />
                Download glossary
              </button>
            )}
            {isLocal && onDeleteLocal && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center w-full gap-2.5 px-3 py-2 text-sm font-medium text-left text-red-600 transition-colors hover:bg-black/[0.06] dark:text-red-400 dark:hover:bg-white/[0.06]"
              >
                <FaTrashAlt className="text-xs" aria-hidden />
                Delete glossary
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
