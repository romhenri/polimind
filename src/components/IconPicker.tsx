'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { IconType } from 'react-icons'
import { FaTimes, FaCheck } from 'react-icons/fa'
import { ICON_NAMES, getQuizIcon } from '@/utils/iconMapper'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  color?: string
  fallbackIcon?: IconType
}

export default function IconPicker({ value, onChange, color, fallbackIcon }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '_')
    if (!q) return ICON_NAMES
    return ICON_NAMES.filter((name) => name.includes(q))
  }, [query])

  const Selected = value ? getQuizIcon(value) : (fallbackIcon ?? getQuizIcon(value))

  const handleSelect = (name: string) => {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center w-full gap-3 px-3 py-2 text-left transition-colors bg-white border-2 rounded-lg border-stone-200 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-600 dark:hover:bg-stone-800/60"
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0 text-white w-9 h-9 rounded-lg"
          style={{ backgroundColor: color ?? '#78716c' }}
        >
          <Selected className="text-lg" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-stone-800 dark:text-white">
            {value || 'Default icon'}
          </span>
          <span className="block text-xs text-stone-500 dark:text-stone-400">
            Click to choose an icon
          </span>
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={() => setOpen(false)} />

            <div className="relative flex flex-col w-full max-w-lg overflow-hidden bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-700 rounded-2xl animate-slide-up max-h-[80vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white">
                  Choose an icon
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 transition-colors rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                  aria-label="Close icon picker"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>

              <div className="px-6 pt-4">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search icons…"
                  className="w-full px-4 py-2.5 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
              </div>

              <div className="p-6 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-8 text-sm text-center text-stone-500 dark:text-stone-400">
                    No icons match “{query}”.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {filtered.map((name) => {
                      const Icon = getQuizIcon(name)
                      const isActive = name === value
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelect(name)}
                          title={name}
                          className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-colors ${
                            isActive
                              ? 'border-stone-400 bg-stone-100 dark:border-stone-500 dark:bg-stone-700/60'
                              : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <Icon
                            className={`text-2xl ${
                              isActive
                                ? 'text-stone-800 dark:text-white'
                                : 'text-stone-600 dark:text-stone-300'
                            }`}
                            aria-hidden
                          />
                          <span className="w-full text-[10px] leading-tight text-center truncate text-stone-500 dark:text-stone-400">
                            {name}
                          </span>
                          {isActive && (
                            <span className="absolute flex items-center justify-center w-4 h-4 rounded-full top-1 right-1 bg-stone-700 text-white text-[8px] dark:bg-stone-200 dark:text-stone-900">
                              <FaCheck />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
