'use client'

import { useEffect, useState } from 'react'
import { FaCheck, FaTimes, FaSyncAlt } from 'react-icons/fa'
import { QuizMetadata, OptionsQuestion } from '@/types/quiz'

interface QuizTesterProps {
  quiz: QuizMetadata
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuizTester({ quiz }: QuizTesterProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({})

  useEffect(() => {
    setAnswers({})
  }, [quiz.id])

  const questions = quiz.questions.filter(
    (q): q is OptionsQuestion => 'options' in q && Array.isArray(q.options)
  )

  const answered = Object.keys(answers).length
  const correct = questions.reduce(
    (total, question, index) => (answers[index] === question.correctAnswer ? total + 1 : total),
    0
  )
  const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (questionIndex in answers) return
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        This quiz has no multiple-choice questions to test.
      </p>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-5 border-2 rounded-lg border-plum-100 bg-plum-50/40 dark:border-plum-900/40 dark:bg-stone-800/60">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Answers stay hidden until you pick one.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            {correct}/{answered} correct
            {answered > 0 && (
              <span className="ml-2 text-plum-600 dark:text-plum-400">{percentage}%</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setAnswers({})}
            disabled={answered === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors bg-transparent border-2 rounded-lg text-plum-700 border-plum-500 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-400 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaSyncAlt /> Reset
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const selected = answers[index]
          const isAnswered = index in answers

          return (
            <div
              key={index}
              className="p-4 border-2 rounded-lg border-stone-200 dark:border-stone-700"
            >
              <p className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
                <span className="text-plum-600 dark:text-plum-400">{index + 1}.</span>{' '}
                {question.question}
              </p>

              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === question.correctAnswer
                  const isSelected = selected === optionIndex

                  let stateClass =
                    'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800'
                  if (isAnswered && isCorrect) {
                    stateClass =
                      'border-green-500 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300'
                  } else if (isAnswered && isSelected) {
                    stateClass =
                      'border-red-500 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'
                  } else if (isAnswered) {
                    stateClass = 'border-stone-200 text-stone-400 dark:border-stone-700 dark:text-stone-500'
                  }

                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() => handleSelect(index, optionIndex)}
                      disabled={isAnswered}
                      className={`flex items-center w-full gap-3 px-4 py-2.5 text-sm text-left transition-colors border-2 rounded-lg disabled:cursor-default ${stateClass}`}
                    >
                      <span className="flex-shrink-0 font-semibold">
                        {LETTERS[optionIndex] ?? optionIndex + 1}
                      </span>
                      <span className="flex-1">{option}</span>
                      {isAnswered && isCorrect && <FaCheck className="flex-shrink-0" />}
                      {isAnswered && isSelected && !isCorrect && (
                        <FaTimes className="flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {isAnswered && question.explain && (
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                  {question.explain}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
