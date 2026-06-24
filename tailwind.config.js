/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#eff2f5',
          100: '#d9dfe8',
          200: '#b3c0d1',
          300: '#8ba0bb',
          400: '#6883a6',
          500: '#50688a',
          600: '#425875',
          700: '#344760',
          800: '#26364a',
          900: '#1b2737',
          950: '#101823',
        },
        marble: '#f5f1e8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Cormorant Garamond', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

