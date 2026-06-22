import React from 'react'
import { useQuizMode } from '@/contexts/QuizModeContext'

const TimeLimitInput = () => {
    const { isDynamicMode, timeLimit, setTimeLimit } = useQuizMode()
  return (
    <div className="flex items-center justify-between w-full gap-4 px-4 py-4 bg-white border-2 sm:w-auto rounded-2xl border-stone-200 dark:bg-stone-900 dark:border-stone-700">
      <label
        htmlFor="timeLimit"
        className={`text-sm font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap sm:text-base ${!isDynamicMode ? 'opacity-50' : ''}`}
      >
        Time Limit:
      </label>
      <input
        id="timeLimit"
        type="number"
        value={timeLimit}
        onChange={(e) => setTimeLimit(Number(e.target.value))}
        disabled={!isDynamicMode}
        className="w-24 px-3 py-2 border rounded-lg text-stone-800 bg-white border-stone-200 dark:bg-stone-800 dark:text-white dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-clay-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800"
      />
    </div>
  )
}

export default TimeLimitInput
