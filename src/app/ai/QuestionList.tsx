'use client'

import { useState } from 'react'
import { FaCheck, FaSyncAlt, FaSpinner, FaPenFancy, FaTimes, FaPen, FaPlus, FaTrash } from 'react-icons/fa'
import { QuizMetadata, OptionsQuestion } from '@/types/quiz'

interface QuestionListProps {
  quiz: QuizMetadata
  regeneratingIndices: Set<number>
  errors: Record<number, string>
  onRegenerate: (index: number, instructions?: string) => void
  onUpdateQuestion: (index: number, question: OptionsQuestion) => void
}

interface DraftQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explain: string
}

export default function QuestionList({
  quiz,
  regeneratingIndices,
  errors,
  onRegenerate,
  onUpdateQuestion,
}: QuestionListProps) {
  const [instructionDrafts, setInstructionDrafts] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<number, DraftQuestion>>({})

  const openInstructions = (index: number) =>
    setInstructionDrafts((prev) => ({ ...prev, [index]: '' }))

  const closeInstructions = (index: number) =>
    setInstructionDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })

  const setInstructions = (index: number, value: string) =>
    setInstructionDrafts((prev) => ({ ...prev, [index]: value }))

  const submitInstructions = (index: number) => {
    onRegenerate(index, instructionDrafts[index]?.trim() || undefined)
    closeInstructions(index)
  }

  const openEdit = (index: number) => {
    const q = quiz.questions[index]
    const options = 'options' in q ? [...q.options] : []
    const correctAnswer = 'correctAnswer' in q ? q.correctAnswer : 0
    setDrafts((prev) => ({
      ...prev,
      [index]: {
        question: q.question,
        options: options.length ? options : ['', '', '', ''],
        correctAnswer,
        explain: q.explain ?? '',
      },
    }))
  }

  const closeEdit = (index: number) =>
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })

  const canSaveDraft = (draft: DraftQuestion) =>
    draft.question.trim() !== '' &&
    draft.options.length >= 2 &&
    draft.options.every((o) => o.trim() !== '') &&
    draft.correctAnswer >= 0 &&
    draft.correctAnswer < draft.options.length

  const saveEdit = (index: number) => {
    const draft = drafts[index]
    if (!draft || !canSaveDraft(draft)) return
    const next: OptionsQuestion = {
      question: draft.question.trim(),
      options: draft.options.map((o) => o.trim()),
      correctAnswer: draft.correctAnswer,
    }
    if (draft.explain.trim()) next.explain = draft.explain.trim()
    onUpdateQuestion(index, next)
    closeEdit(index)
  }

  const updateDraft = (index: number, patch: Partial<DraftQuestion>) =>
    setDrafts((prev) => (prev[index] ? { ...prev, [index]: { ...prev[index], ...patch } } : prev))

  const setOption = (index: number, i: number, value: string) =>
    setDrafts((prev) => {
      const draft = prev[index]
      if (!draft) return prev
      const options = [...draft.options]
      options[i] = value
      return { ...prev, [index]: { ...draft, options } }
    })

  const addOption = (index: number) =>
    setDrafts((prev) =>
      prev[index] ? { ...prev, [index]: { ...prev[index], options: [...prev[index].options, ''] } } : prev
    )

  const removeOption = (index: number, i: number) =>
    setDrafts((prev) => {
      const draft = prev[index]
      if (!draft || draft.options.length <= 2) return prev
      const options = draft.options.filter((_, idx) => idx !== i)
      let correctAnswer = draft.correctAnswer
      if (i === correctAnswer) correctAnswer = 0
      else if (i < correctAnswer) correctAnswer -= 1
      return { ...prev, [index]: { ...draft, options, correctAnswer } }
    })

  return (
    <div className="space-y-3">
      {quiz.questions.map((q, index) => {
        const isRegenerating = regeneratingIndices.has(index)
        const isInstructing = index in instructionDrafts
        const draft = drafts[index]
        const questionError = errors[index]
        const options = 'options' in q ? q.options : []
        const correctAnswer = 'correctAnswer' in q ? q.correctAnswer : -1

        if (draft) {
          return (
            <div
              key={index}
              className="p-4 border-2 rounded-lg border-plum-300 bg-white dark:border-plum-800 dark:bg-stone-800/60"
            >
              <label className="block mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                Question {index + 1}
              </label>
              <textarea
                value={draft.question}
                onChange={(e) => updateDraft(index, { question: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 mb-3 text-sm border-2 rounded-lg resize-none border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white"
              />

              <label className="block mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                Options (select the correct one)
              </label>
              <div className="space-y-2">
                {draft.options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={draft.correctAnswer === i}
                      onChange={() => updateDraft(index, { correctAnswer: i })}
                      className="flex-shrink-0 w-4 h-4 accent-green-600"
                      aria-label={`Mark option ${i + 1} as correct`}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => setOption(index, i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 px-3 py-2 text-sm border-2 rounded-lg border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index, i)}
                      disabled={draft.options.length <= 2}
                      className="flex-shrink-0 p-2 transition-colors rounded-lg text-stone-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addOption(index)}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-plum-700 dark:text-plum-300 hover:underline"
              >
                <FaPlus /> Add option
              </button>

              <label className="block mt-3 mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                Explanation (optional)
              </label>
              <textarea
                value={draft.explain}
                onChange={(e) => updateDraft(index, { explain: e.target.value })}
                rows={2}
                placeholder="Why the correct answer is correct..."
                className="w-full px-3 py-2 text-sm border-2 rounded-lg resize-none border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white"
              />

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => saveEdit(index)}
                  disabled={!canSaveDraft(draft)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaCheck /> Save
                </button>
                <button
                  type="button"
                  onClick={() => closeEdit(index)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800"
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={index}
            className="p-4 border-2 rounded-lg border-plum-100 bg-plum-50/40 dark:border-plum-900/40 dark:bg-stone-800/60"
          >
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              <span className="text-plum-600 dark:text-plum-400">{index + 1}.</span> {q.question}
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
                  value={instructionDrafts[index]}
                  onChange={(e) => setInstructions(index, e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="e.g. make it harder, focus on dates, avoid trick options..."
                  className="w-full px-3 py-2 text-sm border-2 rounded-lg resize-none border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => submitInstructions(index)}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegenerating ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => closeInstructions(index)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800"
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
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegenerating ? (
                    <>
                      <FaSpinner className="animate-spin" /> Regen...
                    </>
                  ) : (
                    <>
                      <FaSyncAlt /> Regen
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openInstructions(index)}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaPenFancy /> Request
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(index)}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaPen /> Edit
                </button>
              </div>
            )}

            {questionError && (
              <div className="p-3 mt-3 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
                {questionError}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
