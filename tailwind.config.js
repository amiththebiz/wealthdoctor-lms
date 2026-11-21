/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#EEF3F9',
          100: '#D5E0EE',
          200: '#AEC2DD',
          300: '#7C9CC4',
          400: '#4D74A6',
          500: '#2E5586',
          600: '#1F4170',
          700: '#15315A',
          800: '#0E2445',
          900: '#0B1F3A',
          950: '#06132A',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,58,0.06), 0 8px 24px -12px rgba(11,31,58,0.18)',
        lift: '0 2px 4px rgba(11,31,58,0.06), 0 18px 40px -16px rgba(11,31,58,0.28)',
      },
    },
  },
  plugins: [],
};
