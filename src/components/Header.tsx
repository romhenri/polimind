'use client'

import Link from 'next/link'
import { FaMoon, FaSun } from 'react-icons/fa'
import { GiGreekTemple } from 'react-icons/gi'
import { useTheme } from '@/contexts/ThemeContext'
import { useProfile } from '@/contexts/ProfileContext'

export default function Header() {
  const { isDarkMode, toggleTheme } = useTheme()
  const { avatar, setIsProfileOpen } = useProfile()

  return (
    <header className="bg-white border-b-2 border-stone-200 dark:bg-stone-900 dark:border-stone-700">
      <div className="container max-w-6xl px-4 py-4 mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <GiGreekTemple className="text-2xl text-clay-500 sm:text-3xl md:text-4xl" />
            <div>
              <h1 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-stone-50 sm:text-3xl md:text-4xl">polimind</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">knowledge challenges</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-3 transition-colors rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
              aria-label={isDarkMode ? 'Enable light mode' : 'Enable dark mode'}
            >
              {isDarkMode ? (
                <FaSun className="text-lg text-clay-300 sm:text-xl" />
              ) : (
                <FaMoon className="text-lg text-stone-700 sm:text-xl" />
              )}
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center justify-center w-12 h-12 text-2xl transition-all duration-200 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full dark:bg-stone-800 dark:hover:bg-stone-700 select-none shadow-sm cursor-pointer"
              aria-label="Open Profile Settings"
            >
              {avatar}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

