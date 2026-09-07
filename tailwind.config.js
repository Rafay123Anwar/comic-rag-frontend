/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Comic base backgrounds
        ink: {
          DEFAULT: '#0d0d10',
          dark: '#08080a',
          surface: '#17171c',
          elevated: '#1d1d24',
          border: '#23232c',
        },
        base: {
          DEFAULT: '#0d0d10',
          surface: '#17171c',
          elevated: '#1d1d24',
          border: '#23232c',
        },
        // Authentic Comic Paper
        paper: {
          DEFAULT: '#f3e7cf',
          dark: '#e5d7bc',
          tint: '#fdf8ee',
        },
        // Comic Accents
        comic: {
          yellow: '#ffd23f',
          'yellow-hover': '#e6bd35',
          pink: '#ff2e63',
          'pink-hover': '#e62453',
          cyan: '#08d9d6',
          'cyan-hover': '#06bfbc',
        },
        // Accent aliases
        accent: {
          DEFAULT: '#ffd23f', // Primary comic yellow
          hover: '#e6bd35',
          light: '#ffe17d',
          muted: 'rgba(255, 210, 63, 0.15)',
          pink: '#ff2e63',
          cyan: '#08d9d6',
        },
        // Text
        text: {
          primary: '#f3f3f6',
          secondary: '#b5b2c0',
          muted: '#8b8896',
          inverse: '#0d0d10',
        },
      },
      fontFamily: {
        comic: ['Bangers', 'cursive', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'pulse-dot': 'pulseDot 1.2s ease-in-out infinite',
        'pop': 'pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px #23232c',
        'elevated': '0 8px 24px rgba(0,0,0,0.7), 0 0 0 1px #2a2a36',
        'comic': '3px 3px 0px #000000',
        'comic-sm': '2px 2px 0px #000000',
        'comic-lg': '4px 4px 0px #000000',
        'comic-yellow': '0 0 14px rgba(255, 210, 63, 0.25)',
        'comic-pink': '0 0 14px rgba(255, 46, 99, 0.25)',
        'comic-cyan': '0 0 14px rgba(8, 217, 214, 0.25)',
      },
    },
  },
  plugins: [],
};
