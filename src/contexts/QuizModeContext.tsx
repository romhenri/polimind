'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface QuizModeContextType {
  isDynamicMode: boolean
  toggleDynamicMode: () => void
  timeLimit: number
  setTimeLimit: (time: number) => void
}

const QuizModeContext = createContext<QuizModeContextType | undefined>(undefined)

export function QuizModeProvider({ children }: { children: ReactNode }) {
  const [isDynamicMode, setIsDynamicMode] = useState(true)
  const [timeLimit, setTimeLimit] = useState(15)

  const toggleDynamicMode = () => {
    setIsDynamicMode(prev => !prev)
  }

  return (
    <QuizModeContext.Provider value={{ isDynamicMode, toggleDynamicMode, timeLimit, setTimeLimit }}>
      {children}
    </QuizModeContext.Provider>
  )
}

export function useQuizMode() {
  const context = useContext(QuizModeContext)
  if (context === undefined) {
    throw new Error('useQuizMode must be used within a QuizModeProvider')
  }
  return context
}

