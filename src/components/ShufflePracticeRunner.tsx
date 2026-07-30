'use client'

import { useEffect, useRef, useState } from 'react'
import { FaArrowLeft, FaPause, FaPlay } from 'react-icons/fa'
import QuestionCard from '@/components/QuestionCard'
import QuizResults, { QuestionMeta } from '@/components/QuizResults'
import { QuizMetadata, QuizState, isAnswerCorrect } from '@/types/quiz'
import { PracticeQuestion, sampleShuffledQuestions } from '@/utils/shufflePractice'
import { shuffleQuestionOptions } from '@/utils/shuffleOptions'
import { useQuizMode } from '@/contexts/QuizModeContext'

interface ShufflePracticeRunnerProps {
  quizzes: QuizMetadata[]
  count: number
  category: string
  onExit: () => void
}

const freshState = (): QuizState => ({
  currentQuestionIndex: 0,
  answers: [],
  startTime: Date.now(),
  questionTimes: [],
  isFinished: false,
})

export default function ShufflePracticeRunner({
  quizzes,
  count,
  category,
  onExit,
}: ShufflePracticeRunnerProps) {
  const { isDynamicMode, timeLimit } = useQuizMode()
  const [runId, setRunId] = useState(0)
  const [practice, setPractice] = useState<PracticeQuestion[]>(() =>
    sampleShuffledQuestions(quizzes, count)
  )
  const [quizState, setQuizState] = useState<QuizState>(freshState)
  const [isPaused, setIsPaused] = useState(false)

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceDeadlineRef = useRef<number | null>(null)
  const pausedRemainingRef = useRef<number | null>(null)

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
    advanceDeadlineRef.current = null
  }

  useEffect(() => clearAutoAdvance, [])

  const advance = (delayMs = 1500) => {
    clearAutoAdvance()
    advanceDeadlineRef.current = Date.now() + delayMs
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      advanceDeadlineRef.current = null
      setQuizState((prev) => {
        if (practice.length === 0) return prev
        if (prev.currentQuestionIndex < practice.length - 1) {
          return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
        }
        return { ...prev, isFinished: true }
      })
    }, delayMs)
  }

  useEffect(() => {
    if (isPaused) {
      if (autoAdvanceRef.current !== null && advanceDeadlineRef.current !== null) {
        const remaining = Math.max(advanceDeadlineRef.current - Date.now(), 0)
        clearAutoAdvance()
        pausedRemainingRef.current = remaining
      }
    } else if (pausedRemainingRef.current !== null) {
      const remaining = pausedRemainingRef.current
      pausedRemainingRef.current = null
      advance(remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused])

  const togglePause = () => setIsPaused((prev) => !prev)

  const handleAnswer = (selectedAnswer: number, timeTaken: number) => {
    setQuizState((prev) => {
      const item = practice[prev.currentQuestionIndex]
      if (!item) return prev
      return {
        ...prev,
        answers: [
          ...prev.answers,
          {
            questionIndex: prev.currentQuestionIndex,
            selectedAnswer,
            isCorrect: isAnswerCorrect(item.question, item.quizType, selectedAnswer),
            timeTaken,
            wasAttempted: true,
          },
        ],
        questionTimes: [...prev.questionTimes, timeTaken],
      }
    })

    if (isDynamicMode) advance()
  }

  const handleTimeOut = () => {
    setQuizState((prev) => {
      const item = practice[prev.currentQuestionIndex]
      if (!item) return prev
      return {
        ...prev,
        answers: [
          ...prev.answers,
          {
            questionIndex: prev.currentQuestionIndex,
            selectedAnswer: -1,
            isCorrect: false,
            timeTaken: timeLimit,
            wasAttempted: false,
          },
        ],
        questionTimes: [...prev.questionTimes, timeLimit],
      }
    })

    advance(1000)
  }

  const handleNext = () => {
    clearAutoAdvance()
    setQuizState((prev) => {
      if (prev.currentQuestionIndex < practice.length - 1) {
        return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
      }
      return { ...prev, isFinished: true }
    })
  }

  const handleReplay = () => {
    clearAutoAdvance()
    pausedRemainingRef.current = null
    setIsPaused(false)
    setPractice((prev) =>
      prev.map((item) => ({
        ...item,
        question: shuffleQuestionOptions(item.question, item.quizType),
      }))
    )
    setQuizState(freshState())
    setRunId((id) => id + 1)
  }

  const handleReshuffle = () => {
    clearAutoAdvance()
    pausedRemainingRef.current = null
    setIsPaused(false)
    setPractice(sampleShuffledQuestions(quizzes, count))
    setQuizState(freshState())
    setRunId((id) => id + 1)
  }

  if (practice.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center card animate-fade-in">
        <p className="mb-4 text-base text-stone-600 dark:text-stone-300 sm:text-lg">
          No questions available in the selected quizzes.
        </p>
        <button type="button" onClick={onExit} className="btn-primary">
          Back to Home
        </button>
      </div>
    )
  }

  if (quizState.isFinished) {
    const questions = practice.map((p) => p.question)
    const questionMeta: QuestionMeta[] = practice.map((p) => ({
      quizType: p.quizType,
      lang: p.lang,
      mathEnabled: p.mathEnabled,
    }))
    return (
      <QuizResults
        questions={questions}
        quizType={practice[0].quizType}
        quizLang={practice[0].lang}
        quizState={quizState}
        subject="shuffle-practice"
        category={category}
        mathEnabled={practice[0].mathEnabled}
        questionMeta={questionMeta}
        onRestart={handleReplay}
        onReshuffle={handleReshuffle}
        onExit={onExit}
        recordCompletion={false}
      />
    )
  }

  const current = practice[quizState.currentQuestionIndex]
  const progress = ((quizState.currentQuestionIndex + 1) / practice.length) * 100
  const correctAnswers = quizState.answers.filter((a) => a.isCorrect).length
  const totalAnswered = quizState.answers.length
  const currentPercentage =
    totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-3 sm:mb-6">
        <div className="items-center justify-between hidden sm:flex sm:mb-4">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 font-semibold text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
          >
            <FaArrowLeft /> Back
          </button>

          {isDynamicMode && (
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex items-center gap-2 font-semibold text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
            >
              {isPaused ? <FaPlay /> : <FaPause />} {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 my-2 sm:mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-wide truncate font-display text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
              {current.source}
            </h1>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Shuffle Practice
            </p>
          </div>
          {totalAnswered > 0 && (
            <div className="flex-shrink-0 text-right">
              <div className="text-xl font-bold text-clay-600 dark:text-clay-400 sm:text-3xl">
                {currentPercentage}%
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
                {correctAnswers}/{totalAnswered} correct
              </div>
            </div>
          )}
        </div>
      </div>

      <QuestionCard
        key={`${runId}-${quizState.currentQuestionIndex}`}
        question={current.question}
        quizType={current.quizType}
        lang={current.lang}
        questionNumber={quizState.currentQuestionIndex + 1}
        currentCorrect={correctAnswers}
        mathEnabled={current.mathEnabled}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onAnswer={handleAnswer}
        onTimeOut={handleTimeOut}
        onNext={handleNext}
      />

      <div className="mt-4 sm:mt-6">
        <div className="h-2 overflow-hidden rounded-full sm:h-3 bg-stone-200 dark:bg-stone-700">
          <div
            className="h-full transition-all duration-500 bg-clay-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="hidden mt-1 text-xs text-center text-stone-600 dark:text-stone-400 sm:mt-2 sm:text-sm sm:block">
          Question {quizState.currentQuestionIndex + 1} of {practice.length}
        </div>
      </div>
    </div>
  )
}
