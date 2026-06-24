'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type AvatarOption = 'user' | 'graduate' | 'tie' | 'ninja' | 'astronaut' | 'secret'

const VALID_AVATARS: AvatarOption[] = ['user', 'graduate', 'tie', 'ninja', 'astronaut', 'secret']

const LEGACY_AVATARS: Record<string, AvatarOption> = {
  '🦉': 'user',
  '🎓': 'graduate',
  '🧠': 'user',
  owl: 'user',
  sage: 'user',
  scholar: 'graduate',
  thinker: 'user',
}

function normalizeAvatar(value: unknown): AvatarOption {
  if (typeof value === 'string') {
    if ((VALID_AVATARS as string[]).includes(value)) return value as AvatarOption
    if (LEGACY_AVATARS[value]) return LEGACY_AVATARS[value]
  }
  return 'user'
}

interface ProfileContextType {
  avatar: AvatarOption
  setAvatar: (avatar: AvatarOption) => void
  completedQuizzes: Record<string, string[]> // maps category to list of completed subjectIds
  completeQuiz: (subjectId: string, category: string) => void
  clearData: () => void
  preferPortuguese: boolean
  setPreferPortuguese: (pref: boolean) => void
  isProfileOpen: boolean
  setIsProfileOpen: (open: boolean) => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

const PROFILE_KEY = 'polimind_profile'

interface StoredProfile {
  avatar: AvatarOption
  completedQuizzes: Record<string, string[]>
  preferPortuguese?: boolean
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatarState] = useState<AvatarOption>('user')
  const [completedQuizzes, setCompletedQuizzes] = useState<Record<string, string[]>>({})
  const [preferPortuguese, setPreferPortugueseState] = useState<boolean>(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StoredProfile
        if (parsed.avatar) {
          setAvatarState(normalizeAvatar(parsed.avatar))
        }
        if (parsed.completedQuizzes) {
          setCompletedQuizzes(parsed.completedQuizzes)
        }
        if (parsed.preferPortuguese !== undefined) {
          setPreferPortugueseState(parsed.preferPortuguese)
        }
      }
    } catch (err) {
      console.error('Error loading profile from localStorage', err)
    }
  }, [])

  const setAvatar = (newAvatar: AvatarOption) => {
    setAvatarState(newAvatar)
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      const current: StoredProfile = stored ? JSON.parse(stored) : { avatar: 'user', completedQuizzes: {}, preferPortuguese: false }
      current.avatar = newAvatar
      localStorage.setItem(PROFILE_KEY, JSON.stringify(current))
    } catch (err) {
      console.error('Error saving avatar to localStorage', err)
    }
  }

  const setPreferPortuguese = (pref: boolean) => {
    setPreferPortugueseState(pref)
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      const current: StoredProfile = stored ? JSON.parse(stored) : { avatar: 'user', completedQuizzes: {}, preferPortuguese: false }
      current.preferPortuguese = pref
      localStorage.setItem(PROFILE_KEY, JSON.stringify(current))
    } catch (err) {
      console.error('Error saving preferPortuguese to localStorage', err)
    }
  }

  const completeQuiz = (subjectId: string, category: string) => {
    if (!subjectId || !category) return

    setCompletedQuizzes(prev => {
      const currentList = prev[category] || []
      if (currentList.includes(subjectId)) {
        return prev // Already completed
      }
      const updated = {
        ...prev,
        [category]: [...currentList, subjectId]
      }
      try {
        const stored = localStorage.getItem(PROFILE_KEY)
        const current: StoredProfile = stored ? JSON.parse(stored) : { avatar: 'user', completedQuizzes: {}, preferPortuguese: false }
        current.completedQuizzes = updated
        localStorage.setItem(PROFILE_KEY, JSON.stringify(current))
      } catch (err) {
        console.error('Error saving completed quiz to localStorage', err)
      }
      return updated
    })
  }

  const clearData = () => {
    setAvatarState('user')
    setCompletedQuizzes({})
    setPreferPortugueseState(false)
    try {
      localStorage.removeItem(PROFILE_KEY)
    } catch (err) {
      console.error('Error clearing profile from localStorage', err)
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        avatar,
        setAvatar,
        completedQuizzes,
        completeQuiz,
        clearData,
        preferPortuguese,
        setPreferPortuguese,
        isProfileOpen,
        setIsProfileOpen
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
