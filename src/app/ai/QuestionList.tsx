'use client'

import { useState } from 'react'
import { FaCheck, FaSyncAlt, FaSpinner, FaPenFancy, FaTimes } from 'react-icons/fa'
import { QuizMetadata } from '@/types/quiz'

interface QuestionListProps {
  quiz: QuizMetadata
  regeneratingIndex: number | null
  error: string | null
  onRegenerate: (index: number, instructions?: string) => void
}

export default function QuestionList({ quiz, regeneratingIndex, error, onRegenerate }: QuestionListProps) {
  const [instructIndex, setInstructIndex] = useState<number | null>(null)
  const [instructions, setInstructions] = useState('')

  const busy = regeneratingIndex !== null

  const openInstructions = (index: number) => {
    setInstructIndex(index)
    setInstructions('')
  }

  const closeInstructions = () => {
    setInstructIndex(null)
    setInstructions('')
  }

  const submitInstructions = (index: number) => {
    onRegenerate(index, instructions.trim() || undefined)
    closeInstructions()
  }

  return (
    <div className="space-y-3">
      {quiz.questions.map((q, index) => {
        const isRegenerating = regeneratingIndex === index
        const isInstructing = instructIndex === index
        const options = 'options' in q ? q.options : []
        const correctAnswer = 'correctAnswer' in q ? q.correctAnswer : -1

        return (
          <div
            key={index}
            className="p-4 border-2 rounded-lg border-purple-100 bg-purple-50/40 dark:border-purple-900/40 dark:bg-stone-800/60"
          >
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              <span className="text-purple-600 dark:text-purple-400">{index + 1}.</span> {q.question}
            </p>

            <ul className="mt-3 space-y-1.5">
              {options.map((option, i) => {
                const correct = i === correctAnswer
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-sm ${
                      correct
                        ? 'font-semibold text-green-700 dark:text-green-400'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {correct ? (
                      <FaCheck className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="flex-shrink-0 w-3.5" aria-hidden />
                    )}
                    {option}
                  </li>
                )
              })}
            </ul>

            {q.explain && (
              <p className="mt-2 text-xs italic text-stone-500 dark:text-stone-400">{q.explain}</p>
            )}

            {isInstructing ? (
              <div className="mt-3">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="e.g. make it harder, focus on dates, avoid trick options..."
                  className="w-full px-3 py-2 text-sm border-2 rounded-lg resize-none border-purple-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-900/60 dark:bg-stone-800 dark:text-white"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => submitInstructions(index)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegenerating ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={closeInstructions}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onRegenerate(index)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegenerating ? (
                    <>
                      <FaSpinner className="animate-spin" /> Regenerating...
                    </>
                  ) : (
                    <>
                      <FaSyncAlt /> Regenerate
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openInstructions(index)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaPenFancy /> With instructions
                </button>
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <div className="p-3 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
          {error}
        </div>
      )}
    </div>
  )
}
