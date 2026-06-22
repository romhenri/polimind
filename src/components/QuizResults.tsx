'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Confetti from 'react-confetti'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaClock,
  FaPercentage,
  FaStar,
  FaRedo,
  FaHome
} from 'react-icons/fa'
import { FaTrophy, FaThumbsUp, FaDumbbell } from 'react-icons/fa6'
import {
  Question,
  QuizState,
  QuizType,
  formatUserAnswerText,
  formatCorrectAnswerText,
} from '@/types/quiz'
import { formatSubject } from '@/utils/formatSubject'
import MathText from '@/components/MathText'

interface QuizResultsProps {
  questions: Question[]
  quizType: QuizType
  quizLang?: string
  quizState: QuizState
  subject: string
  mathEnabled?: boolean
  onRestart: () => void
}

export default function QuizResults({
  questions,
  quizType,
  quizLang,
  quizState,
  subject,
  mathEnabled = false,
  onRestart,
}: QuizResultsProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const totalQuestions = questions.length
  const correctAnswers = quizState.answers.filter(a => a.isCorrect).length
  const wrongAnswers = quizState.answers.filter(a => a.wasAttempted && !a.isCorrect).length
  const unattempted = quizState.answers.filter(a => !a.wasAttempted).length
  const percentage = Math.round((correctAnswers / totalQuestions) * 100)
  const totalTime = quizState.questionTimes.reduce((acc, time) => acc + time, 0)
  const avgTime = Math.round(totalTime / totalQuestions * 10) / 10

  const getPerformanceMessage = () => {
    if (percentage >= 90) return { text: 'Excellent!', color: 'text-yellow-600 dark:text-yellow-400', Icon: FaTrophy }
    if (percentage >= 70) return { text: 'Very Good!', color: 'text-green-600 dark:text-green-400', Icon: FaStar }
    if (percentage >= 50) return { text: 'Good job!', color: 'text-clay-600 dark:text-clay-400', Icon: FaThumbsUp }
    return { text: 'Keep practicing!', color: 'text-stone-600 dark:text-stone-400', Icon: FaDumbbell }
  }

  const performance = getPerformanceMessage()
  const PerformanceIcon = performance.Icon

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {showConfetti && percentage >= 50 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <div className="mb-6 text-center sm:mb-8">
        <div className={`flex justify-center mb-3 sm:mb-4 ${performance.color}`}>
          <PerformanceIcon className="text-5xl sm:text-6xl md:text-7xl" aria-hidden />
        </div>
        <h1 className={`font-display text-3xl font-bold tracking-wide mb-1 sm:text-4xl md:text-5xl sm:mb-2 ${performance.color}`}>
          {performance.text}
        </h1>
        <p className="text-base text-stone-600 dark:text-stone-300 sm:text-lg md:text-xl">
          {formatSubject(subject)} Quiz completed!
        </p>
      </div>

      <div className="mb-6 text-center card sm:mb-8 bg-clay-50 dark:bg-stone-900">
        <div className="mb-1 text-4xl font-bold text-clay-600 dark:text-clay-400 sm:text-5xl md:text-6xl sm:mb-2">
          {percentage}%
        </div>
        <div className="mb-1 text-lg font-semibold text-stone-700 dark:text-stone-200 sm:text-xl md:text-2xl">
          {correctAnswers}/{totalQuestions}
        </div>
        <div className="text-sm text-stone-600 dark:text-stone-400 sm:text-base md:text-lg">
          {correctAnswers === 1 ? 'correct' : 'correct'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="card bg-green-50 border-2 border-green-200 dark:bg-green-950/40 dark:border-green-800">
          <div className="flex items-center gap-4">
            <FaCheckCircle className="text-2xl text-green-600 dark:text-green-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 sm:text-3xl">{correctAnswers}</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Correct Answers</div>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 border-2 border-red-200 dark:bg-red-950/40 dark:border-red-800">
          <div className="flex items-center gap-4">
            <FaTimesCircle className="text-2xl text-red-600 dark:text-red-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 sm:text-3xl">{wrongAnswers}</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Wrong Answers</div>
            </div>
          </div>
        </div>

        <div className="border-2 card bg-stone-50 border-stone-200 dark:bg-stone-800/80 dark:border-stone-600">
          <div className="flex items-center gap-4">
            <FaQuestionCircle className="text-2xl text-stone-600 dark:text-stone-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-stone-600 dark:text-stone-300 sm:text-3xl">{unattempted}</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Unanswered</div>
            </div>
          </div>
        </div>

        <div className="border-2 card bg-clay-50 border-clay-200 dark:bg-clay-900/40 dark:border-clay-800">
          <div className="flex items-center gap-4">
            <FaPercentage className="text-2xl text-clay-600 dark:text-clay-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-clay-600 dark:text-clay-400 sm:text-3xl">{percentage}%</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Percentage</div>
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-2 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800">
          <div className="flex items-center gap-4">
            <FaClock className="text-2xl text-purple-600 dark:text-purple-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 sm:text-3xl">{totalTime}s</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Total Time</div>
            </div>
          </div>
        </div>

        <div className="card bg-indigo-50 border-2 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800">
          <div className="flex items-center gap-4">
            <FaStar className="text-2xl text-indigo-600 dark:text-indigo-400 sm:text-3xl md:text-4xl" />
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 sm:text-3xl">{avgTime}s</div>
              <div className="text-xs text-stone-600 dark:text-stone-400 sm:text-sm">Average Time</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={onRestart} className="btn-primary flex items-center justify-center gap-2">
          <FaRedo />
          Try Again
        </button>
        <Link href="/" className="btn-secondary flex items-center justify-center gap-2">
          <FaHome />
          Back to Home
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="flex items-center gap-2 mb-4 text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl md:text-4xl sm:mb-6">
          Questions Review
        </h2>
        <div className="space-y-4">
          {questions.map((question, index) => {
            const answer = quizState.answers[index]
            return (
              <div key={index} className="card">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    answer.isCorrect ? 'bg-green-500 text-white' :
                    answer.wasAttempted ? 'bg-red-500 text-white' : 'bg-stone-400 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-grow">
                    <h3 className="mb-2 font-semibold text-stone-800 dark:text-stone-100">
                      <MathText mathEnabled={mathEnabled}>{question.question}</MathText>
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className={answer.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        <strong>Your answer:</strong>{' '}
                        <MathText as="span" mathEnabled={mathEnabled}>
                          {formatUserAnswerText(
                            question,
                            quizType,
                            answer.selectedAnswer,
                            answer.wasAttempted,
                            quizLang
                          )}
                        </MathText>
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-green-600 dark:text-green-400">
                          <strong>Correct answer:</strong>{' '}
                          <MathText as="span" mathEnabled={mathEnabled}>
                            {formatCorrectAnswerText(question, quizType, quizLang)}
                          </MathText>
                        </p>
                      )}
                      {question.explain && (
                        <p className="pt-2 mt-2 border-t text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600">
                          <MathText as="span" mathEnabled={mathEnabled}>
                            {question.explain}
                          </MathText>
                        </p>
                      )}
                      <p className="text-stone-500 dark:text-stone-400">
                        <strong>Time:</strong> {answer.timeTaken}s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
