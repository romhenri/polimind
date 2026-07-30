'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ShufflePracticeRunner from '@/components/ShufflePracticeRunner'
import {
  loadShuffleSelection,
  ShufflePracticeSelection,
} from '@/utils/shufflePractice'

export default function ShufflePracticePage() {
  const router = useRouter()
  const [selection, setSelection] = useState<ShufflePracticeSelection | null | undefined>(
    undefined
  )

  useEffect(() => {
    setSelection(loadShuffleSelection())
  }, [])

  if (selection === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-b-2 rounded-full border-clay-500 animate-spin" />
      </div>
    )
  }

  if (!selection || selection.quizzes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center card">
          <p className="mb-4 text-base text-stone-600 dark:text-stone-300 sm:text-lg">
            No shuffle selected. Pick some quizzes from the home page first.
          </p>
          <Link href="/" className="inline-block btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ShufflePracticeRunner
      quizzes={selection.quizzes}
      count={selection.count}
      category={selection.category}
      onExit={() => router.push('/')}
    />
  )
}
