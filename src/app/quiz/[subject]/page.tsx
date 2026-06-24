'use client'

import { useState, useEffect, useRef, use } from 'react'
import QuestionCard from '@/components/QuestionCard'
import QuizResults from '@/components/QuizResults'
import {
  Question,
  QuizState,
  QuizType,
  normalizeQuizType,
  isAnswerCorrect,
} from '@/types/quiz'
import { FaArrowLeft } from 'react-icons/fa'
import Link from 'next/link'
import { formatSubject } from '@/utils/formatSubject'
import { useQuizMode } from '@/contexts/QuizModeContext'
import { useProfile } from '@/contexts/ProfileContext'

export default function QuizPage({ params }: { params: Promise<{ subject: string }> }) {
  const resolvedParams = use(params)
  const { isDynamicMode, timeLimit } = useQuizMode()
  const { preferPortuguese } = useProfile()
  const [questions, setQuestions] = useState<Question[]>([])
  const [category, setCategory] = useState<string>('')
  const [mathEnabled, setMathEnabled] = useState(false)
  const [quizType, setQuizType] = useState<QuizType>('options')
  const [quizLang, setQuizLang] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: [],
    startTime: 0,
    questionTimes: [],
    isFinished: false
  })

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
  }

  useEffect(() => {
    return () => clearAutoAdvance()
  }, [])

  useEffect(() => {
    setQuizState(prev => ({
      ...prev,
      startTime: Date.now()
    }))
  }, [])

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch(`/data/${resolvedParams.subject}.json`)
        if (!response.ok) {
          throw new Error('Subject not found')
        }
        const parsed = await response.json()
        const data = Array.isArray(parsed)
          ? (preferPortuguese ? parsed[0] : (parsed[1] || parsed[0]))
          : parsed
        setQuestions(data.questions)
        setCategory(data.category || 'General')
        const tags = Array.isArray(data.tags) ? data.tags : []
        setMathEnabled(
          tags.some((t: unknown) => String(t).toLowerCase() === 'math')
        )
        setQuizType(normalizeQuizType(data.type))
        setQuizLang(data.lang)
        setLoading(false)
      } catch (err) {
        setError('Error loading questions. Please try again.')
        setLoading(false)
      }
    }

    loadQuestions()
  }, [resolvedParams.subject, preferPortuguese])

  const handleAnswer = (selectedAnswer: number, timeTaken: number) => {
    setQuizState(prev => {
      const currentQuestion = questions[prev.currentQuestionIndex]
      if (!currentQuestion) return prev

      const newAnswer = {
        questionIndex: prev.currentQuestionIndex,
        selectedAnswer,
        isCorrect: isAnswerCorrect(currentQuestion, quizType, selectedAnswer),
        timeTaken,
        wasAttempted: true
      }

      return {
        ...prev,
        answers: [...prev.answers, newAnswer],
        questionTimes: [...prev.questionTimes, timeTaken]
      }
    })

    if (isDynamicMode) {
      clearAutoAdvance()
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null
        setQuizState(prev => {
          const len = questions.length
          if (len === 0) return prev
          if (prev.currentQuestionIndex < len - 1) {
            return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
          }
          return { ...prev, isFinished: true }
        })
      }, 1500)
    }
  }

  const handleNext = () => {
    clearAutoAdvance()
    setQuizState(prev => {
      if (prev.currentQuestionIndex < questions.length - 1) {
        return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
      }
      return { ...prev, isFinished: true }
    })
  }

  const handleTimeOut = () => {
    setQuizState(prev => {
      const currentQuestion = questions[prev.currentQuestionIndex]
      if (!currentQuestion) return prev

      const newAnswer = {
        questionIndex: prev.currentQuestionIndex,
        selectedAnswer: -1,
        isCorrect: false,
        timeTaken: timeLimit,
        wasAttempted: false
      }

      return {
        ...prev,
        answers: [...prev.answers, newAnswer],
        questionTimes: [...prev.questionTimes, timeLimit]
      }
    })

    clearAutoAdvance()
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      setQuizState(prev => {
        const len = questions.length
        if (len === 0) return prev
        if (prev.currentQuestionIndex < len - 1) {
          return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
        }
        return { ...prev, isFinished: true }
      })
    }, 1000)
  }

  const handleRestart = () => {
    clearAutoAdvance()
    setQuizState({
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      questionTimes: [],
      isFinished: false
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-b-2 rounded-full border-clay-500 animate-spin"></div>
          <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center card">
          <p className="mb-4 text-base text-red-600 sm:text-lg md:text-xl">{error}</p>
          <Link href="/" className="inline-block btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (quizState.isFinished) {
    return (
      <QuizResults
        questions={questions}
        quizType={quizType}
        quizLang={quizLang}
        quizState={quizState}
        subject={resolvedParams.subject}
        category={category}
        mathEnabled={mathEnabled}
        onRestart={handleRestart}
      />
    )
  }

  const currentQuestion = questions[quizState.currentQuestionIndex]
  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100

  const correctAnswers = quizState.answers.filter(a => a.isCorrect).length
  const totalAnswered = quizState.answers.length
  const currentPercentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-3 sm:mb-6 md:mb-8">
        <Link
          href="/"
          className="items-center hidden gap-2 mb-2 font-semibold sm:inline-flex sm:mb-4 text-clay-600 dark:text-clay-400 hover:text-clay-700 dark:hover:text-clay-300"
        >
          <FaArrowLeft /> Back
        </Link>

        <div className="flex items-center justify-between my-2 sm:mb-4">
          <h1 className="font-display text-2xl font-bold tracking-wide text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
            {formatSubject(resolvedParams.subject)}
          </h1>
          {totalAnswered > 0 && (
            <div className="text-right">
              <div className="text-xl font-bold text-clay-600 dark:text-clay-400 sm:text-3xl">{currentPercentage}%</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">{correctAnswers}/{totalAnswered} correct</div>
            </div>
          )}
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        quizType={quizType}
        lang={quizLang}
        questionNumber={quizState.currentQuestionIndex + 1}
        currentCorrect={correctAnswers}
        mathEnabled={mathEnabled}
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
          Question {quizState.currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>
    </div>
  )
}
