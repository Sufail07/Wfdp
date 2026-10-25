import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { type ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Decision Brief' },
    { path: '/accuracy', label: 'Forecast Accuracy' },
    { path: '/method', label: 'Method & Data' },
  ]

  return (
    <div className="min-h-screen bg-bg text-moment">
      <header className="sticky top-0 z-50 border-b border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-8">
              <Link to="/" className="font-serif text-display text-moment tracking-tight">
                Wind Forecast Portal
              </Link>
              <nav className="hidden md:flex items-center gap-6 text-data">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-data transition-colors ${
                      location.pathname === item.path
                        ? 'font-semibold text-moment'
                        : 'text-context hover:text-moment'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded border border-color text-context hover:text-moment transition-colors bg-transparent"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-color py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-caption text-context">
          Wind Forecast Decision Portal &copy; 2026
        </div>
      </footer>
    </div>
  )
}
