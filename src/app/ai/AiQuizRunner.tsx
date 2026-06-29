'use client'

import { useEffect, useRef, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa'
import QuestionCard from '@/components/QuestionCard'
import QuizResults from '@/components/QuizResults'
import {
  QuizMetadata,
  QuizState,
  QuizType,
  normalizeQuizType,
  isAnswerCorrect,
} from '@/types/quiz'
import { useQuizMode } from '@/contexts/QuizModeContext'

interface AiQuizRunnerProps {
  quiz: QuizMetadata
  onExit: () => void
}

export default function AiQuizRunner({ quiz, onExit }: AiQuizRunnerProps) {
  const { isDynamicMode, timeLimit } = useQuizMode()
  const questions = quiz.questions
  const quizType: QuizType = normalizeQuizType(quiz.type)
  const mathEnabled = quiz.tags.some((tag) => tag.toLowerCase() === 'math')

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: [],
    startTime: Date.now(),
    questionTimes: [],
    isFinished: false,
  })

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
  }

  useEffect(() => clearAutoAdvance, [])

  const handleAnswer = (selectedAnswer: number, timeTaken: number) => {
    setQuizState((prev) => {
      const currentQuestion = questions[prev.currentQuestionIndex]
      if (!currentQuestion) return prev
      return {
        ...prev,
        answers: [
          ...prev.answers,
          {
            questionIndex: prev.currentQuestionIndex,
            selectedAnswer,
            isCorrect: isAnswerCorrect(currentQuestion, quizType, selectedAnswer),
            timeTaken,
            wasAttempted: true,
          },
        ],
        questionTimes: [...prev.questionTimes, timeTaken],
      }
    })

    if (isDynamicMode) {
      clearAutoAdvance()
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null
        setQuizState((prev) => {
          if (questions.length === 0) return prev
          if (prev.currentQuestionIndex < questions.length - 1) {
            return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
          }
          return { ...prev, isFinished: true }
        })
      }, 1500)
    }
  }

  const handleNext = () => {
    clearAutoAdvance()
    setQuizState((prev) => {
      if (prev.currentQuestionIndex < questions.length - 1) {
        return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
      }
      return { ...prev, isFinished: true }
    })
  }

  const handleTimeOut = () => {
    setQuizState((prev) => {
      const currentQuestion = questions[prev.currentQuestionIndex]
      if (!currentQuestion) return prev
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

    clearAutoAdvance()
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      setQuizState((prev) => {
        if (questions.length === 0) return prev
        if (prev.currentQuestionIndex < questions.length - 1) {
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
      isFinished: false,
    })
  }

  if (quizState.isFinished) {
    return (
      <div className="animate-fade-in">
        <QuizResults
          questions={questions}
          quizType={quizType}
          quizLang={quiz.lang}
          quizState={quizState}
          subject={quiz.id}
          category={quiz.category}
          mathEnabled={mathEnabled}
          onRestart={handleRestart}
        />
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 font-semibold text-plum-600 dark:text-plum-400 hover:text-plum-700 dark:hover:text-plum-300"
          >
            <FaArrowLeft /> Back to generator
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[quizState.currentQuestionIndex]
  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100
  const correctAnswers = quizState.answers.filter((a) => a.isCorrect).length
  const totalAnswered = quizState.answers.length
  const currentPercentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-3 sm:mb-6 md:mb-6">
        <button
          type="button"
          onClick={onExit}
          className="items-center hidden gap-2 mb-2 font-semibold sm:inline-flex sm:mb-4 text-plum-600 dark:text-plum-400 hover:text-plum-700 dark:hover:text-plum-300"
        >
          <FaArrowLeft /> Back
        </button>

        <div className="flex items-center justify-between my-2 sm:mb-4">
          <h1 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
            {quiz.name}
          </h1>
          {totalAnswered > 0 && (
            <div className="text-right">
              <div className="text-xl font-bold text-plum-600 dark:text-plum-400 sm:text-3xl">{currentPercentage}%</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">{correctAnswers}/{totalAnswered} correct</div>
            </div>
          )}
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        quizType={quizType}
        lang={quiz.lang}
        questionNumber={quizState.currentQuestionIndex + 1}
        currentCorrect={correctAnswers}
        mathEnabled={mathEnabled}
        onAnswer={handleAnswer}
        onTimeOut={handleTimeOut}
        onNext={handleNext}
      />

      <div className="mt-4 sm:mt-6">
        <div className="h-2 overflow-hidden rounded-full sm:h-3 bg-stone-200 dark:bg-stone-700">
          <div className="h-full transition-all duration-500 bg-plum-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="hidden mt-1 text-xs text-center text-stone-600 dark:text-stone-400 sm:mt-2 sm:text-sm sm:block">
          Question {quizState.currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>
    </div>
  )
}
