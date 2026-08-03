'use client'

import { useState } from 'react'
import { FaPlus, FaTrash, FaSyncAlt, FaSpinner, FaMagic } from 'react-icons/fa'
import type { Glossary, GlossaryGroup } from '@/types/glossary'

interface GlossaryEditorProps {
  glossary: Glossary
  onChange: (glossary: Glossary) => void
  onRegenerateAll?: () => void
  regenerating?: boolean
  onAskTerm?: (groupIndex: number, request: string) => Promise<void>
}

const fieldClass =
  'w-full px-3 py-2 text-sm border-2 rounded-lg border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white'

export default function GlossaryEditor({
  glossary,
  onChange,
  onRegenerateAll,
  regenerating,
  onAskTerm,
}: GlossaryEditorProps) {
  const [askOpen, setAskOpen] = useState<number | null>(null)
  const [askText, setAskText] = useState('')
  const [askingGi, setAskingGi] = useState<number | null>(null)
  const [askError, setAskError] = useState<string | null>(null)

  const submitAsk = async (gi: number) => {
    if (!onAskTerm || !askText.trim()) return
    setAskingGi(gi)
    setAskError(null)
    try {
      await onAskTerm(gi, askText.trim())
      setAskText('')
      setAskOpen(null)
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Could not generate the term.')
    } finally {
      setAskingGi(null)
    }
  }

  const setGroups = (groups: GlossaryGroup[]) => onChange({ ...glossary, groups })

  const updateGroup = (gi: number, patch: Partial<GlossaryGroup>) =>
    setGroups(glossary.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))

  const updateTerm = (gi: number, ti: number, patch: Partial<{ term: string; definition: string }>) =>
    setGroups(
      glossary.groups.map((g, i) =>
        i === gi
          ? { ...g, group: g.group.map((t, j) => (j === ti ? { ...t, ...patch } : t)) }
          : g
      )
    )

  const addTerm = (gi: number) =>
    setGroups(
      glossary.groups.map((g, i) =>
        i === gi ? { ...g, group: [...g.group, { term: '', definition: '' }] } : g
      )
    )

  const removeTerm = (gi: number, ti: number) =>
    setGroups(
      glossary.groups.map((g, i) =>
        i === gi ? { ...g, group: g.group.filter((_, j) => j !== ti) } : g
      )
    )

  const addGroup = () =>
    setGroups([...glossary.groups, { groupName: '', group: [{ term: '', definition: '' }] }])

  const removeGroup = (gi: number) => setGroups(glossary.groups.filter((_, i) => i !== gi))

  return (
    <div className="space-y-5">
      {glossary.groups.map((group, gi) => (
        <div
          key={gi}
          className="p-4 border-2 rounded-lg border-plum-100 bg-plum-50/40 dark:border-plum-900/40 dark:bg-stone-800/60"
        >
          <div className="flex items-center gap-2 mb-3">
            <input
              value={group.groupName ?? ''}
              onChange={(e) => updateGroup(gi, { groupName: e.target.value || null })}
              placeholder="Group title (optional)"
              className={`${fieldClass} font-semibold`}
            />
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              className="flex-shrink-0 p-2 transition-colors rounded-lg text-stone-400 hover:text-red-600"
              aria-label="Remove group"
            >
              <FaTrash />
            </button>
          </div>

          <div className="space-y-3">
            {group.group.map((term, ti) => (
              <div
                key={ti}
                className="p-3 border rounded-lg border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={term.term}
                    onChange={(e) => updateTerm(gi, ti, { term: e.target.value })}
                    placeholder="Term"
                    className={`${fieldClass} font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => removeTerm(gi, ti)}
                    className="flex-shrink-0 p-2 transition-colors rounded-lg text-stone-400 hover:text-red-600"
                    aria-label="Remove term"
                  >
                    <FaTrash />
                  </button>
                </div>
                <textarea
                  value={term.definition}
                  onChange={(e) => updateTerm(gi, ti, { definition: e.target.value })}
                  rows={2}
                  placeholder="Definition"
                  className={`${fieldClass} resize-none`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <button
              type="button"
              onClick={() => addTerm(gi)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-plum-700 dark:text-plum-300 hover:underline"
            >
              <FaPlus /> Add term
            </button>
            {onAskTerm && (
              <button
                type="button"
                onClick={() => {
                  setAskOpen((cur) => (cur === gi ? null : gi))
                  setAskText('')
                  setAskError(null)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-plum-700 dark:text-plum-300 hover:underline"
              >
                <FaMagic /> Ask for
              </button>
            )}
          </div>

          {onAskTerm && askOpen === gi && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitAsk(gi)
                    }
                  }}
                  autoFocus
                  disabled={askingGi === gi}
                  placeholder="Describe the term to add…"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => submitAsk(gi)}
                  disabled={askingGi === gi || !askText.trim()}
                  className="flex items-center justify-center flex-shrink-0 gap-1.5 px-3 py-2 text-sm font-semibold text-white transition-colors rounded-lg bg-plum-600 hover:bg-plum-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {askingGi === gi ? <FaSpinner className="animate-spin" /> : <FaMagic />}
                </button>
              </div>
              {askError && <p className="mt-1 text-xs text-red-600">{askError}</p>}
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800"
        >
          <FaPlus /> Add group
        </button>
        {onRegenerateAll && (
          <button
            type="button"
            onClick={onRegenerateAll}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {regenerating ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Regenerate all
          </button>
        )}
      </div>
    </div>
  )
}
