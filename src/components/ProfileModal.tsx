'use client'

import { useEffect, useState } from 'react'
import { useProfile, AvatarOption } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { FaTimes, FaCheck, FaAward } from 'react-icons/fa'

const AVATAR_OPTIONS: { emoji: AvatarOption; name: string; desc: string }[] = [
  { emoji: '🦉', name: 'Wise Owl', desc: 'Seeker of deep knowledge' },
  { emoji: '🎓', name: 'Scholar', desc: 'Academic master' },
  { emoji: '🧠', name: 'Thinker', desc: 'Analytical mind' },
]

export default function ProfileModal() {
  const {
    avatar,
    setAvatar,
    completedQuizzes,
    preferPortuguese,
    setPreferPortuguese,
    isProfileOpen,
    setIsProfileOpen,
  } = useProfile()
  const { isDarkMode, toggleTheme } = useTheme()

  const [categories, setCategories] = useState<string[]>([])
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isProfileOpen) return

    const loadStats = async () => {
      setLoading(true)
      try {
        const listRes = await fetch('/api/quiz-slugs', { cache: 'no-store' })
        if (!listRes.ok) throw new Error('Failed to load subjects')
        const { slugs } = (await listRes.json()) as { slugs: string[] }

        const fetchedCategories: string[] = []
        const totals: Record<string, number> = {}

        await Promise.all(
          slugs.map(async (slug) => {
            try {
              const res = await fetch(`/data/${slug}.json`)
              if (!res.ok) return
              const rawData = await res.json()
              const data = Array.isArray(rawData) ? rawData[0] : rawData
              const cat = data.category || 'General'
              fetchedCategories.push(cat)
              totals[cat] = (totals[cat] || 0) + 1
            } catch (err) {
              console.error(`Error loading data for ${slug}:`, err)
            }
          })
        )

        const uniqueCats = Array.from(new Set(fetchedCategories)).sort()
        setCategories(uniqueCats)
        setCategoryTotals(totals)
      } catch (err) {
        console.error('Error loading profile stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [isProfileOpen])

  // Close modal on escape keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }
    if (isProfileOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isProfileOpen, setIsProfileOpen])

  if (!isProfileOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click closer */}
      <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden bg-white border border-stone-200 shadow-2xl dark:bg-stone-900 dark:border-stone-850 rounded-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white flex items-center gap-2">
            <FaAward className="text-clay-500" />
            Your Profile
          </h2>
          <button
            onClick={() => setIsProfileOpen(false)}
            className="p-2 transition-colors rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            aria-label="Close modal"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-8">
          {/* Section 1: Choose Avatar */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Choose Avatar
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_OPTIONS.map(({ emoji, name, desc }) => {
                const isActive = avatar === emoji
                return (
                  <button
                    key={emoji}
                    onClick={() => setAvatar(emoji)}
                    className={`relative p-4 flex flex-col items-center text-center rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? 'border-clay-500 bg-clay-50/50 dark:bg-clay-950/20 dark:border-clay-400'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-800/40 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="text-4xl mb-2 select-none">{emoji}</span>
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {name}
                    </span>
                    {isActive && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-clay-500 text-white text-[10px]">
                        <FaCheck />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/50">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Preferences
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
                  Dark mode
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={toggleTheme}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 rounded-full peer dark:bg-stone-700 peer-focus:ring-2 peer-focus:ring-clay-300 dark:peer-focus:ring-clay-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clay-500 transition-colors"></div>
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
                  Prefer Portuguese when able
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={preferPortuguese}
                    onChange={(e) => setPreferPortuguese(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 rounded-full peer dark:bg-stone-700 peer-focus:ring-2 peer-focus:ring-clay-300 dark:peer-focus:ring-clay-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clay-500 transition-colors"></div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Quizzes Completed */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/50">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Quizzes Completed
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-8 h-8 border-b-2 rounded-full border-clay-500 animate-spin"></div>
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Loading stats...</p>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">
                No subjects loaded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => {
                  const completed = completedQuizzes[category]?.length || 0
                  const total = categoryTotals[category] || 0
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {category}
                        </span>
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          {completed} / {total} completed ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                        <div
                          className="h-full bg-clay-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={() => setIsProfileOpen(false)}
            className="btn-primary text-sm py-2 px-6"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
