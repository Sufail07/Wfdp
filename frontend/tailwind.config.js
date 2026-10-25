/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        // Direction F - Publication Moment: 2-color palette (moment + context)
        moment: '#111827',
        context: '#6b7280',
        'context-light': '#9ca3af',
        // Surface / background
        bg: '#ffffff',
        surface: '#f8fafc',
        border: '#e2e8f0',
        // Spacing rhythm derived from half-hour grid (base 4px -> 48-part day)
        spacing: {
          '18': '4.5rem',
          '22': '5.5rem',
          '26': '6.5rem',
        },
      },
      fontSize: {
        'moment': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'heading': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'data': ['0.875rem', { lineHeight: '1.7', letterSpacing: '0.02em' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
      },
    },
  },
  plugins: [],
}
