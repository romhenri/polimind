'use client'

import { FaBolt, FaPause } from 'react-icons/fa'
import { useQuizMode } from '@/contexts/QuizModeContext'

export default function DynamicModeToggle() {
  const { isDynamicMode, toggleDynamicMode } = useQuizMode()

  return (
    <div className="flex items-center justify-between w-full gap-4 px-4 py-4 bg-white border-2 sm:w-auto rounded-2xl border-stone-200 dark:bg-stone-900 dark:border-stone-700">
      <div className="text-left">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-white sm:text-base">
          {isDynamicMode ? (
            <>
              Dynamic Mode
            </>
          ) : (
            <>
              Dynamic Mode
            </>
          )}
        </div>
        <div className="text-sm text-stone-500 dark:text-stone-400">
          {isDynamicMode
            ? 'Timer active and auto advance'
            : 'Timer active and auto advance'}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleDynamicMode}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 sm:h-8 sm:w-16 ${
          isDynamicMode ? 'bg-clay-500' : 'bg-stone-300 dark:bg-stone-600'
        }`}
        aria-label={isDynamicMode ? 'Disable dynamic mode' : 'Enable dynamic mode'}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 sm:h-6 sm:w-6 ${
            isDynamicMode ? 'translate-x-5 sm:translate-x-9' : 'translate-x-0.5 sm:translate-x-1'
          }`}
        >
          <span className="flex items-center justify-center h-full">
            {isDynamicMode ? (
              <FaBolt className="text-xs text-clay-500 sm:text-sm" />
            ) : (
              <FaPause className="text-xs text-stone-500 sm:text-sm" />
            )}
          </span>
        </span>
      </button>
    </div>
  )
}

