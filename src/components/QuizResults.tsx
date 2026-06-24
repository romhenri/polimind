'use client'

import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import Link from 'next/link'
import Confetti from 'react-confetti'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaClock,
  FaStopwatch,
  FaBullseye,
  FaBolt,
  FaStar,
  FaRedo,
  FaHome,
  FaArrowRight,
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
import { useProfile } from '@/contexts/ProfileContext'
import { TRAILS } from '@/data/trails'

interface Stat {
  label: string
  value: string | number
  Icon: IconType
  tint: string
}

function StatGroup({
  title,
  HeaderIcon,
  stats,
  cols,
}: {
  title: string
  HeaderIcon: IconType
  stats: Stat[]
  cols: string
}) {
  return (
    <div className="overflow-hidden border-2 rounded-xl border-stone-200 dark:border-stone-700">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60">
        <HeaderIcon className="text-clay-500 dark:text-clay-400" aria-hidden />
        <h3 className="text-lg font-bold tracking-wide font-display text-stone-800 dark:text-white">
          {title}
        </h3>
      </div>
      <div className={`grid ${cols} gap-px bg-stone-200 dark:bg-stone-700`}>
        {stats.map(({ label, value, Icon, tint }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 px-3 py-5 text-center bg-white dark:bg-stone-900"
          >
            <Icon className={`text-lg ${tint} sm:text-xl`} aria-hidden />
            <div className="text-2xl font-bold text-stone-800 dark:text-white sm:text-3xl">
              {value}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface QuizResultsProps {
  questions: Question[]
  quizType: QuizType
  quizLang?: string
  quizState: QuizState
  subject: string
  category: string
  mathEnabled?: boolean
  onRestart: () => void
}

export default function QuizResults({
  questions,
  quizType,
  quizLang,
  quizState,
  subject,
  category,
  mathEnabled = false,
  onRestart,
}: QuizResultsProps) {
  const { completeQuiz } = useProfile()
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    completeQuiz(subject, category)
  }, [subject, category, completeQuiz])

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

  const trail = TRAILS.find((t) => t.quizzes.includes(subject))
  const trailIndex = trail ? trail.quizzes.indexOf(subject) : -1
  const nextSlug =
    trail && trailIndex >= 0 && trailIndex < trail.quizzes.length - 1
      ? trail.quizzes[trailIndex + 1]
      : null

  const precisionStats: Stat[] = [
    { label: 'Correct', value: correctAnswers, Icon: FaCheckCircle, tint: 'text-green-600 dark:text-green-500' },
    { label: 'Wrong', value: wrongAnswers, Icon: FaTimesCircle, tint: 'text-red-500 dark:text-red-400' },
    { label: 'Unanswered', value: unattempted, Icon: FaQuestionCircle, tint: 'text-stone-400 dark:text-stone-500' },
  ]

  const agilityStats: Stat[] = [
    { label: 'Total Time', value: `${totalTime}s`, Icon: FaClock, tint: 'text-clay-500 dark:text-clay-400' },
    { label: 'Avg Time', value: `${avgTime}s`, Icon: FaStopwatch, tint: 'text-clay-500 dark:text-clay-400' },
  ]

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

      <div className="mb-6 card sm:mb-8 bg-clay-50 dark:bg-stone-900/60">
        <div className="flex flex-col items-center text-center">
          <div className="font-display text-5xl font-bold text-clay-600 dark:text-clay-400 sm:text-6xl md:text-7xl">
            {percentage}%
          </div>
          <div className="mt-1 text-base font-semibold text-stone-700 dark:text-stone-200 sm:text-lg">
            {correctAnswers} of {totalQuestions} correct
          </div>
        </div>
        <div className="w-full h-2.5 mt-4 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700 sm:mt-5">
          <div
            className="h-full transition-all duration-700 bg-clay-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2">
        <StatGroup title="Precision" HeaderIcon={FaBullseye} stats={precisionStats} cols="grid-cols-3" />
        <StatGroup title="Agility" HeaderIcon={FaBolt} stats={agilityStats} cols="grid-cols-2" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col justify-center w-full gap-4 sm:flex-row-reverse">
          {nextSlug ? (
            <>
              <Link href={`/quiz/${nextSlug}`} className="flex items-center justify-center gap-2 btn-primary">
                Next quiz
                <FaArrowRight />
              </Link>
              <button onClick={onRestart} className="flex items-center justify-center gap-2 btn-secondary">
                <FaRedo />
                Retry
              </button>
            </>
          ) : trail ? (
            <>
              <Link href={`/trails/${trail.id}`} className="flex items-center justify-center gap-2 btn-primary">
                Back to {trail.name}
                <FaArrowRight />
              </Link>
              <button onClick={onRestart} className="flex items-center justify-center gap-2 btn-secondary">
                <FaRedo />
                Retry
              </button>
            </>
          ) : (
            <>
              <button onClick={onRestart} className="flex items-center justify-center gap-2 btn-primary">
                <FaRedo />
                Try Again
              </button>
              <Link href="/" className="flex items-center justify-center gap-2 btn-secondary">
                <FaHome />
                Back to Home
              </Link>
            </>
          )}
        </div>
        {trail && (
          <Link
            href="/"
            className="text-sm font-medium transition-colors text-stone-500 hover:text-clay-600 dark:text-stone-400 dark:hover:text-clay-400"
          >
            Back to home
          </Link>
        )}
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
