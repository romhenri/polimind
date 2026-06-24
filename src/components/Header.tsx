'use client'

import Link from 'next/link'
import { GiGreekTemple } from 'react-icons/gi'
import { SiGooglegemini } from 'react-icons/si'
import { IoMdMap } from 'react-icons/io'
import { useProfile } from '@/contexts/ProfileContext'
import { AVATAR_ICONS } from '@/utils/avatarMapper'

export default function Header() {
  const { avatar, setIsProfileOpen } = useProfile()
  const AvatarIcon = AVATAR_ICONS[avatar]

  return (
    <header className="bg-white border-b-2 border-stone-200 dark:bg-stone-900 dark:border-stone-700">
      <div className="container max-w-6xl px-4 py-4 mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <GiGreekTemple className="text-2xl text-clay-500 sm:text-3xl md:text-4xl" />
            <div>
              <h1 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-stone-50 sm:text-3xl md:text-4xl">polimind</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">knowledge challenges</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/trails"
              className="inline-flex items-center justify-center p-3 transition-colors rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
              aria-label="Browse learning trails"
            >
              <IoMdMap className="text-lg text-clay-500 sm:text-xl" />
            </Link>

            <Link
              href="/ai"
              className="inline-flex items-center justify-center p-3 transition-colors rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
              aria-label="Open AI quiz generator"
            >
              <SiGooglegemini className="text-lg text-clay-500 sm:text-xl" />
            </Link>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center justify-center w-12 h-12 transition-all duration-200 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-full dark:bg-stone-800 dark:hover:bg-stone-700 select-none shadow-sm cursor-pointer"
              aria-label="Open Profile Settings"
            >
              <AvatarIcon className="text-xl text-clay-600 dark:text-clay-400 sm:text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

