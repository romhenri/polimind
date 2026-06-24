'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Question,
  QuizType,
  isAnswerCorrect,
  correctBoolIndex,
  boolLabel,
} from '@/types/quiz'
import { FaClock, FaArrowRight } from 'react-icons/fa'
import { useQuizMode } from '@/contexts/QuizModeContext'
import MathText from '@/components/MathText'

interface QuestionCardProps {
  question: Question
  quizType: QuizType
  lang?: string
  questionNumber: number
  currentCorrect: number
  mathEnabled?: boolean
  onAnswer: (answer: number, timeTaken: number) => void
  onTimeOut: () => void
  onNext: () => void
}

export default function QuestionCard({
  question,
  quizType,
  lang,
  questionNumber,
  currentCorrect,
  mathEnabled = false,
  onAnswer,
  onTimeOut,
  onNext,
}: QuestionCardProps) {
  const { isDynamicMode, timeLimit } = useQuizMode()
  const interactionLockedRef = useRef(false)
  const [interactionLocked, setInteractionLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [percentageChange, setPercentageChange] = useState<number | null>(null)

  useEffect(() => {
    if (!question) return
    setStartTime(Date.now())
  }, [question])

  useEffect(() => {
    if (!question) return
    interactionLockedRef.current = false
    setInteractionLocked(false)
    setTimeLeft(timeLimit)
    setSelectedAnswer(null)
    setShowResult(false)
    setStartTime(Date.now())
  }, [question, timeLimit])

  useEffect(() => {
    if (showResult || !isDynamicMode || !question) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            if (interactionLockedRef.current) return
            interactionLockedRef.current = true
            setInteractionLocked(true)
            onTimeOut()
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showResult, onTimeOut, isDynamicMode, question])

  useEffect(() => {
    if (!showResult) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const ae = document.activeElement
      if (ae instanceof HTMLElement && ae.hasAttribute('data-quiz-next')) return

      const t = e.target as Node | null
      if (t instanceof HTMLElement) {
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      }

      e.preventDefault()
      onNext()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showResult, onNext])

  if (!question?.question) {
    return null
  }

  if (quizType === 'options' && (!('options' in question) || !question.options)) {
    return null
  }

  if (quizType === 'bool' && !('result' in question)) {
    return null
  }

  const choiceDisabled = interactionLocked || showResult || selectedAnswer !== null

  const handleAnswerClick = (index: number) => {
    if (interactionLockedRef.current || showResult || selectedAnswer !== null) return
    interactionLockedRef.current = true
    setInteractionLocked(true)

    const timeTaken = isDynamicMode ? Math.round((Date.now() - startTime) / 1000) : 0
    const isCorrect = isAnswerCorrect(question, quizType, index)

    const newCorrect = isCorrect ? currentCorrect + 1 : currentCorrect
    const newPercentage = Math.round((newCorrect / questionNumber) * 100)

    setPercentageChange(newPercentage)
    setSelectedAnswer(index)
    setShowResult(true)
    onAnswer(index, timeTaken)
  }

  const getAnswerClass = (index: number) => {
    if (!showResult) {
      return 'bg-white dark:bg-stone-800 hover:bg-clay-50 dark:hover:bg-stone-700 border-2 border-stone-300 dark:border-stone-600 hover:border-clay-500 dark:hover:border-clay-400'
    }

    if (quizType === 'bool' && 'result' in question) {
      const correctIdx = correctBoolIndex(question.result)
      if (index === correctIdx) {
        return 'bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-400'
      }
      if (index === selectedAnswer && index !== correctIdx) {
        return 'bg-red-100 dark:bg-red-900 border-2 border-red-500 dark:border-red-400'
      }
      return 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600'
    }

    if ('correctAnswer' in question && index === question.correctAnswer) {
      return 'bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-400'
    }

    if ('correctAnswer' in question && index === selectedAnswer && index !== question.correctAnswer) {
      return 'bg-red-100 dark:bg-red-900 border-2 border-red-500 dark:border-red-400'
    }

    return 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600'
  }

  const isCorrectSelection = (): boolean => {
    if (selectedAnswer === null) return false
    return isAnswerCorrect(question, quizType, selectedAnswer)
  }

  const getTimerColor = () => {
    if (timeLeft > 6) return 'text-green-600 dark:text-green-400'
    if (timeLeft > 3) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="card animate-slide-up p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-6">
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 sm:text-sm">
          Question #{questionNumber}
        </div>
        {isDynamicMode && (
          <div className={`flex items-center gap-2 text-lg font-bold sm:text-2xl ${getTimerColor()}`}>
            <FaClock className={timeLeft <= 3 ? 'animate-pulse' : ''} />
            {timeLeft}s
          </div>
        )}
      </div>

      <h2 className="mb-2 text-base font-bold text-left text-stone-800 dark:text-white sm:mb-4 sm:text-xl md:mb-6 md:text-2xl">
        <MathText mathEnabled={mathEnabled}>{question.question}</MathText>
      </h2>

      {quizType === 'bool' && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => handleAnswerClick(0)}
            disabled={choiceDisabled}
            className={`w-full p-2 rounded-lg text-center font-semibold transition-all duration-300 sm:p-4 ${getAnswerClass(0)} ${
              choiceDisabled
                ? 'cursor-not-allowed'
                : 'cursor-pointer transform hover:scale-102'
            }`}
          >
            {boolLabel(false, lang)}
          </button>
          <button
            type="button"
            onClick={() => handleAnswerClick(1)}
            disabled={choiceDisabled}
            className={`w-full p-2 rounded-lg text-center font-semibold transition-all duration-300 sm:p-4 ${getAnswerClass(1)} ${
              choiceDisabled
                ? 'cursor-not-allowed'
                : 'cursor-pointer transform hover:scale-102'
            }`}
          >
            {boolLabel(true, lang)}
          </button>
        </div>
      )}
      {quizType === 'options' && 'options' in question && question.options && (
        <div className="flex flex-col gap-2 md:gap-4">
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAnswerClick(index)}
              disabled={choiceDisabled}
              className={`w-full p-2 rounded-lg text-left font-semibold transition-all duration-300 sm:p-4 ${getAnswerClass(index)} ${
                choiceDisabled
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer transform hover:scale-102'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex items-center justify-center flex-shrink-0 p-2 text-sm font-bold rounded-full w-7 h-7 text-stone-800 bg-stone-200 dark:bg-stone-600 dark:text-white sm:w-8 sm:h-8 sm:text-base">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm text-stone-800 dark:text-stone-200 sm:text-base">
                  <MathText mathEnabled={mathEnabled}>{option}</MathText>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {showResult && (
        <>
          <div
            className={`mt-3 p-3 rounded-lg text-center font-semibold animate-fade-in sm:mt-6 sm:p-4 ${
              isCorrectSelection()
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <div className="text-sm sm:text-lg">
                {isCorrectSelection() ? 'Correct!' : 'Incorrect!'}
              </div>
              {percentageChange !== null && (
                <div className="text-lg font-bold sm:text-2xl">
                  {percentageChange}% correct
                </div>
              )}
              {!isCorrectSelection() && (
                <div className="mt-0.5 text-xs sm:mt-1 sm:text-sm">The correct answer is highlighted in green.</div>
              )}
            </div>
          </div>

          {question.explain && (
            <div className="p-3 mt-3 text-sm text-left border rounded-lg sm:mt-4 sm:p-4 bg-stone-100 dark:bg-stone-800/80 border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 sm:text-base animate-fade-in">
              <MathText mathEnabled={mathEnabled}>{question.explain}</MathText>
            </div>
          )}

          {!isDynamicMode && (
            <button
              type="button"
              data-quiz-next
              onClick={onNext}
              className="flex items-center justify-center w-full gap-2 mt-3 btn-primary sm:mt-6"
            >
              Next Question
              <FaArrowRight />
            </button>
          )}
        </>
      )}
    </div>
  )
}
