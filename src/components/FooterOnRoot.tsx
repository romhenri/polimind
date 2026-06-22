'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

export default function FooterOnRoot() {
  const pathname = usePathname()
  if (pathname !== '/') return null
  return <Footer />
}
