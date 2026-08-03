'use client'

import { FaPlus, FaTrash, FaSyncAlt, FaSpinner } from 'react-icons/fa'
import type { QuizMetadata, ClassifyFacet, ClassifyGroup, ClassifyEntity } from '@/types/quiz'

interface ClassifyEditorProps {
  quiz: QuizMetadata
  onChange: (quiz: QuizMetadata) => void
  onRegenerateEntity: (index: number) => void
  regeneratingEntities: Set<number>
  entityErrors: Record<number, string>
}

const fieldClass =
  'w-full px-3 py-2 text-sm border-2 rounded-lg border-plum-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-plum-900/60 dark:bg-stone-800 dark:text-white'

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`
}

export default function ClassifyEditor({
  quiz,
  onChange,
  onRegenerateEntity,
  regeneratingEntities,
  entityErrors,
}: ClassifyEditorProps) {
  const facets = quiz.facets ?? []
  const entities = quiz.entities ?? []

  const setFacets = (next: ClassifyFacet[]) => onChange({ ...quiz, facets: next })
  const setEntities = (next: ClassifyEntity[]) => onChange({ ...quiz, entities: next })
  const commit = (nextFacets: ClassifyFacet[], nextEntities: ClassifyEntity[]) =>
    onChange({ ...quiz, facets: nextFacets, entities: nextEntities })

  const updateFacet = (fi: number, patch: Partial<ClassifyFacet>) =>
    setFacets(facets.map((f, i) => (i === fi ? { ...f, ...patch } : f)))

  const updateGroup = (fi: number, gi: number, patch: Partial<ClassifyGroup>) =>
    setFacets(
      facets.map((f, i) =>
        i === fi ? { ...f, groups: f.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)) } : f
      )
    )

  const addGroup = (fi: number) =>
    setFacets(
      facets.map((f, i) =>
        i === fi ? { ...f, groups: [...f.groups, { id: uid('group'), label: 'New group' }] } : f
      )
    )

  const removeGroup = (fi: number, gi: number) => {
    const facet = facets[fi]
    if (facet.groups.length <= 2) return
    const removedId = facet.groups[gi].id
    const remaining = facet.groups.filter((_, j) => j !== gi)
    const nextFacets = facets.map((f, i) => (i === fi ? { ...f, groups: remaining } : f))
    const nextEntities = entities.map((e) =>
      e.answers[facet.id] === removedId
        ? { ...e, answers: { ...e.answers, [facet.id]: remaining[0].id } }
        : e
    )
    commit(nextFacets, nextEntities)
  }

  const addFacet = () => {
    const facet: ClassifyFacet = {
      id: uid('facet'),
      label: 'New facet',
      prompt: 'Which group does {entity} belong to?',
      groups: [
        { id: uid('group'), label: 'Group 1' },
        { id: uid('group'), label: 'Group 2' },
      ],
    }
    const nextEntities = entities.map((e) => ({
      ...e,
      answers: { ...e.answers, [facet.id]: facet.groups[0].id },
    }))
    commit([...facets, facet], nextEntities)
  }

  const removeFacet = (fi: number) => {
    if (facets.length <= 1) return
    const removed = facets[fi]
    const nextFacets = facets.filter((_, i) => i !== fi)
    const nextEntities = entities.map((e) => {
      const answers = { ...e.answers }
      delete answers[removed.id]
      return { ...e, answers }
    })
    commit(nextFacets, nextEntities)
  }

  const updateEntity = (ei: number, patch: Partial<ClassifyEntity>) =>
    setEntities(entities.map((e, i) => (i === ei ? { ...e, ...patch } : e)))

  const setAnswer = (ei: number, facetId: string, groupId: string) =>
    setEntities(
      entities.map((e, i) => (i === ei ? { ...e, answers: { ...e.answers, [facetId]: groupId } } : e))
    )

  const addEntity = () => {
    const answers: Record<string, string> = {}
    facets.forEach((f) => {
      if (f.groups[0]) answers[f.id] = f.groups[0].id
    })
    setEntities([...entities, { id: uid('entity'), entity: 'New entity', answers }])
  }

  const removeEntity = (ei: number) => setEntities(entities.filter((_, i) => i !== ei))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Facets
        </h3>
        <div className="space-y-4">
          {facets.map((facet, fi) => (
            <div
              key={facet.id}
              className="p-4 border-2 rounded-lg border-plum-100 bg-plum-50/40 dark:border-plum-900/40 dark:bg-stone-800/60"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={facet.label}
                  onChange={(e) => updateFacet(fi, { label: e.target.value })}
                  placeholder="Facet label"
                  className={`${fieldClass} font-semibold`}
                />
                <div className="flex items-center gap-2">
                  <input
                    value={facet.prompt}
                    onChange={(e) => updateFacet(fi, { prompt: e.target.value })}
                    placeholder="Prompt with {entity}"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeFacet(fi)}
                    disabled={facets.length <= 1}
                    className="flex-shrink-0 p-2 transition-colors rounded-lg text-stone-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Remove facet"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {facet.groups.map((group, gi) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <input
                      value={group.label}
                      onChange={(e) => updateGroup(fi, gi, { label: e.target.value })}
                      placeholder="Group label"
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(fi, gi)}
                      disabled={facet.groups.length <= 2}
                      className="flex-shrink-0 p-2 transition-colors rounded-lg text-stone-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Remove group"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addGroup(fi)}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-plum-700 dark:text-plum-300 hover:underline"
              >
                <FaPlus /> Add group
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFacet}
          className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800"
        >
          <FaPlus /> Add facet
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Entities ({entities.length})
        </h3>
        <div className="space-y-4">
          {entities.map((entity, ei) => {
            const isRegenerating = regeneratingEntities.has(ei)
            const error = entityErrors[ei]
            return (
              <div
                key={entity.id}
                className="p-4 border-2 rounded-lg border-stone-200 dark:border-stone-700"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={entity.entity}
                    onChange={(e) => updateEntity(ei, { entity: e.target.value })}
                    placeholder="Entity name"
                    className={`${fieldClass} font-semibold`}
                  />
                  <input
                    value={entity.subtitle ?? ''}
                    onChange={(e) => updateEntity(ei, { subtitle: e.target.value || undefined })}
                    placeholder="Subtitle (optional)"
                    className={fieldClass}
                  />
                </div>

                <div className="grid gap-3 mt-3 sm:grid-cols-2">
                  {facets.map((facet) => (
                    <div key={facet.id}>
                      <label className="block mb-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                        {facet.label}
                      </label>
                      <select
                        value={entity.answers[facet.id] ?? ''}
                        onChange={(e) => setAnswer(ei, facet.id, e.target.value)}
                        className={fieldClass}
                      >
                        {!facet.groups.some((g) => g.id === entity.answers[facet.id]) && (
                          <option value="">— select —</option>
                        )}
                        {facet.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => onRegenerateEntity(ei)}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegenerating ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Reclassify
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntity(ei)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800"
                  >
                    <FaTrash /> Remove
                  </button>
                </div>

                {error && (
                  <div className="p-3 mt-3 text-sm border-2 rounded-lg text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800">
                    {error}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={addEntity}
          className="inline-flex items-center gap-2 px-4 py-2 mt-3 text-sm font-semibold transition-colors border-2 rounded-lg text-plum-700 border-plum-300 hover:bg-plum-50 dark:text-plum-300 dark:border-plum-800 dark:hover:bg-stone-800"
        >
          <FaPlus /> Add entity
        </button>
      </div>
    </div>
  )
}
