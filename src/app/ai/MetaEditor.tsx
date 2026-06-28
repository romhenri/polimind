'use client'

import { useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { QuizMetadata } from '@/types/quiz'
import { AVAILABLE_COLORS, getColor } from '@/utils/colorMapper'
import { slugify } from '@/utils/geminiQuiz'

const COLOR_KEYS = Object.keys(AVAILABLE_COLORS)
const HARDNESS_VALUES = ['easy', 'medium', 'hard'] as const

interface MetaEditorProps {
  quiz: QuizMetadata
  onSave: (meta: Partial<QuizMetadata>) => void
  onCancel: () => void
}

const fieldClass =
  'w-full px-4 py-2.5 text-sm border-2 rounded-lg border-stone-200 bg-white text-stone-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-plum-500 dark:border-stone-700 dark:bg-stone-800 dark:text-white'
const labelClass = 'block mb-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200'

export default function MetaEditor({ quiz, onSave, onCancel }: MetaEditorProps) {
  const [id, setId] = useState(quiz.id)
  const [name, setName] = useState(quiz.name)
  const [description, setDescription] = useState(quiz.description)
  const [color, setColor] = useState(quiz.color)
  const [category, setCategory] = useState(quiz.category)
  const [tags, setTags] = useState(quiz.tags.join(', '))
  const [hardness, setHardness] = useState<(typeof HARDNESS_VALUES)[number]>(
    HARDNESS_VALUES.includes(quiz.hardness as (typeof HARDNESS_VALUES)[number])
      ? (quiz.hardness as (typeof HARDNESS_VALUES)[number])
      : 'medium'
  )

  const handleSave = () => {
    onSave({
      id: slugify(id),
      name: name.trim() || quiz.name,
      description: description.trim(),
      color,
      category: category.trim() || 'General',
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      hardness,
    })
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>ID (slug)</label>
          <input value={id} onChange={(e) => setId(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <div className="flex items-center gap-2">
            <span
              className="flex-shrink-0 w-6 h-6 border rounded-full border-stone-300 dark:border-stone-600"
              style={{ backgroundColor: getColor(color) }}
              aria-hidden
            />
            <select value={color} onChange={(e) => setColor(e.target.value)} className={fieldClass}>
              {COLOR_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Hardness</label>
          <select
            value={hardness}
            onChange={(e) => setHardness(e.target.value as (typeof HARDNESS_VALUES)[number])}
            className={fieldClass}
          >
            {HARDNESS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tags (comma separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-5 sm:flex-row">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-colors bg-plum-600 rounded-lg hover:bg-plum-700 active:bg-plum-800"
        >
          <FaCheck /> Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-colors bg-transparent border-2 rounded-lg text-stone-600 border-stone-300 hover:bg-stone-100 dark:text-stone-300 dark:border-stone-600 dark:hover:bg-stone-800"
        >
          <FaTimes /> Cancel
        </button>
      </div>
    </div>
  )
}
