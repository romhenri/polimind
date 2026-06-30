import type { Metadata } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import FooterOnRoot from '@/components/FooterOnRoot'
import ProfileModal from '@/components/ProfileModal'
import { QuizModeProvider } from '@/contexts/QuizModeContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProfileProvider } from '@/contexts/ProfileContext'

const inter = Inter({ subsets: ['latin'] })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'polimind',
  description: 'Aprenda múltiplas ciências em trilhas de quiz na plataforma polimind',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${cormorant.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <QuizModeProvider>
            <ProfileProvider>
              <div className="flex min-h-[100svh] flex-col bg-marble dark:bg-stone-950">
                <Header />
                <main className="container max-w-6xl flex-grow px-4 py-2 pb-24 md:py-8 md:pb-8 mx-auto overflow-x-hidden">
                  {children}
                </main>
                <FooterOnRoot />
                <BottomNav />
                <ProfileModal />
              </div>
            </ProfileProvider>
          </QuizModeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

