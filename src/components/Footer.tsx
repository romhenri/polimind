import { FaGithub, FaHeart } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer className="mt-12 bg-white border-t border-stone-200 dark:bg-stone-900 dark:border-stone-700">
      <div className="container max-w-6xl px-4 py-6 mx-auto">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-stone-600 dark:text-stone-400">
            polimind
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/romhenri/polimind"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              aria-label="GitHub"
            >
              <FaGithub className="text-xl sm:text-2xl" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
