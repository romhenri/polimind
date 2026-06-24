'use client'

import { useEffect } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useQuizMode } from '@/contexts/QuizModeContext'
import { FaTimes, FaCheck, FaAward, FaTrashAlt } from 'react-icons/fa'
import { AVATAR_OPTIONS } from '@/utils/avatarMapper'

export default function ProfileModal() {
  const {
    avatar,
    setAvatar,
    clearData,
    preferPortuguese,
    setPreferPortuguese,
    isProfileOpen,
    setIsProfileOpen,
  } = useProfile()
  const { isDarkMode, toggleTheme } = useTheme()
  const { isDynamicMode, timeLimit, setTimeLimit } = useQuizMode()

  const handleClearData = () => {
    if (
      window.confirm(
        'Clear all your saved data (progress, avatar and preferences)? This cannot be undone.'
      )
    ) {
      clearData()
    }
  }

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
      <div className="relative w-full max-w-lg overflow-hidden bg-white border border-stone-200 shadow-2xl dark:bg-stone-900 dark:border-stone-700 rounded-2xl animate-slide-up">
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
              {AVATAR_OPTIONS.map(({ id, name, Icon }) => {
                const isActive = avatar === id
                return (
                  <button
                    key={id}
                    onClick={() => setAvatar(id)}
                    className={`relative p-4 flex flex-col items-center text-center rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? 'border-clay-500 bg-clay-50/50 dark:bg-clay-950/20 dark:border-clay-400'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-800/40 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Icon
                      className={`mb-2 text-4xl ${
                        isActive ? 'text-clay-500 dark:text-clay-400' : 'text-stone-500 dark:text-stone-400'
                      }`}
                    />
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
              <div className={`flex items-center justify-between gap-4 ${!isDynamicMode ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <label
                    htmlFor="timeLimit"
                    className="text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Dynamic time limit
                  </label>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Seconds allowed per question while Dynamic mode is on
                  </p>
                </div>
                <input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  disabled={!isDynamicMode}
                  className="w-20 px-3 py-1.5 text-sm text-stone-800 bg-white border rounded-lg border-stone-200 dark:bg-stone-800 dark:text-white dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-clay-500 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <button
            onClick={handleClearData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors bg-transparent border-2 rounded-lg text-stone-600 border-stone-300 hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:text-stone-300 dark:border-stone-600 dark:hover:border-red-500/50 dark:hover:text-red-400 dark:hover:bg-red-950/30"
          >
            <FaTrashAlt />
            Clear data
          </button>
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
