'use client'

import { useState } from 'react'
import { FaBalanceScale, FaSpinner, FaTrash } from 'react-icons/fa'
import type { QuizMetadata } from '@/types/quiz'
import { judgeQuiz } from '@/utils/aiQuiz'
import type { AiSettings, JudgeResult, OpenRouterModelOption } from '@/utils/aiQuiz'

interface AiJudgeProps {
  quiz: QuizMetadata
  models: OpenRouterModelOption[]
  defaultModel?: string
  buildSettings: () => AiSettings
}

const MAX_RUNS = 3

function scoreClass(score: number): string {
  if (score >= 8) return 'text-green-700 dark:text-green-400'
  if (score >= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function modelLabel(models: OpenRouterModelOption[], id: string): string {
  return models.find((m) => m.id === id)?.name ?? id
}

export default function AiJudge({ quiz, models, defaultModel, buildSettings }: AiJudgeProps) {
  const [model, setModel] = useState(defaultModel ?? models[0]?.id ?? '')
  const [running, setRunning] = useState<string[]>([])
  const [results, setResults] = useState<JudgeResult[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const full = results.length + running.length >= MAX_RUNS
  const alreadyRunning = running.includes(model)

  const handleJudge = async () => {
    if (!model || full || alreadyRunning) return
    setRunning((prev) => [...prev, model])
    setErrors((prev) => {
      const next = { ...prev }
      delete next[model]
      return next
    })
    const judged = model
    try {
      const result = await judgeQuiz(buildSettings(), quiz, judged)
      setResults((prev) => [...prev.filter((r) => r.model !== judged), result])
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [judged]: err instanceof Error ? err.message : 'Judging failed.',
      }))
    } finally {
      setRunning((prev) => prev.filter((m) => m !== judged))
    }
  }

  return (
    <div className="p-6 mt-6 bg-white border-2 rounded-xl border-plum-200 dark:bg-stone-900 dark:border-plum-900/60 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <FaBalanceScale className="text-plum-500" aria-hidden />
        <h2 className="text-lg font-semibold text-stone-800 dark:text-white">AI Judge</h2>
      </div>
      <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
        Score each question from 0 to 10 with one model. Run it again with another model to append a
        column and compare, up to {MAX_RUNS}.
      </p>

      <div className="flex flex-col gap-3 mb-1 sm:flex-row">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="flex-1 px-3 py-3 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleJudge}
          disabled={!model || full || alreadyRunning}
          className="flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white transition-colors rounded-lg bg-plum-600 hover:bg-plum-700 active:bg-plum-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaBalanceScale /> {results.length > 0 ? 'Judge with this model' : 'Judge quality'}
        </button>
      </div>
      {running.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <FaSpinner className="animate-spin text-plum-500" />
          Judging with {running.map((m) => modelLabel(models, m)).join(', ')}...
        </p>
      )}
      {results.length >= MAX_RUNS && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {MAX_RUNS} models compared. Remove one to run another.
        </p>
      )}

      {Object.entries(errors).map(([failed, message]) => (
        <div
          key={failed}
          className="p-3 mt-3 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800"
        >
          <span className="font-semibold">{modelLabel(models, failed)}:</span> {message}
        </div>
      ))}

      {results.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-200 dark:border-stone-700">
                <th className="py-2 pr-3 text-left font-semibold text-stone-600 dark:text-stone-300">
                  Question
                </th>
                {results.map((r) => (
                  <th key={r.model} className="px-2 py-2 text-center align-bottom">
                    <div className="flex flex-col items-center gap-1">
                      <span className="max-w-32 text-xs font-semibold break-words text-stone-700 dark:text-stone-200">
                        {modelLabel(models, r.model)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResults((prev) => prev.filter((x) => x.model !== r.model))}
                        aria-label={`Remove ${modelLabel(models, r.model)} results`}
                        className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quiz.questions.map((q, i) => (
                <tr key={i} className="border-b border-stone-100 dark:border-stone-800">
                  <td className="py-2 pr-3 align-top text-stone-700 dark:text-stone-300">
                    <span className="font-semibold text-plum-600 dark:text-plum-400">{i + 1}.</span>{' '}
                    {q.question}
                  </td>
                  {results.map((r) => {
                    const entry = r.questions.find((s) => s.index === i)
                    return (
                      <td key={r.model} className="px-2 py-2 text-center align-top">
                        {entry ? (
                          <span
                            title={entry.issue || undefined}
                            className={`font-semibold cursor-help ${scoreClass(entry.score)}`}
                          >
                            {entry.score}
                          </span>
                        ) : (
                          <span className="text-stone-300 dark:text-stone-600">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-stone-200 dark:border-stone-700">
                <td className="py-2 pr-3 font-semibold text-stone-700 dark:text-stone-200">Overall</td>
                {results.map((r) => (
                  <td key={r.model} className={`px-2 py-2 text-center font-bold ${scoreClass(r.overall)}`}>
                    {r.overall}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          <div className="mt-4 space-y-3">
            {results
              .filter((r) => r.summary)
              .map((r) => (
                <p key={r.model} className="text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-semibold text-stone-600 dark:text-stone-300">
                    {modelLabel(models, r.model)}:
                  </span>{' '}
                  {r.summary}
                </p>
              ))}
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Hover a score to see the issue the model flagged.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
