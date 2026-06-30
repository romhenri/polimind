'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GiGreekTemple } from 'react-icons/gi'
import { SiGooglegemini } from 'react-icons/si'
import { IoMdMap } from 'react-icons/io'
import { IoLibrary } from 'react-icons/io5'
import { IconType } from 'react-icons'

const NAV_ITEMS: { href: string; label: string; Icon: IconType }[] = [
  { href: '/', label: 'Home', Icon: GiGreekTemple },
  { href: '/lib', label: 'Lib', Icon: IoLibrary },
  { href: '/trails', label: 'Trail', Icon: IoMdMap },
  { href: '/ai', label: 'AI', Icon: SiGooglegemini },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700 md:hidden">
      <div className="flex items-stretch justify-center gap-2 mx-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex w-20 flex-col items-center justify-center gap-1 py-2 transition-colors ${
                active
                  ? 'text-clay-500'
                  : 'text-stone-500 dark:text-stone-400 hover:text-clay-500'
              }`}
            >
              <Icon className="text-2xl" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
