import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { type ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Decision Brief' },
    { path: '/accuracy', label: 'Forecast Accuracy' },
    { path: '/method', label: 'Method & Data' },
  ]

  return (
    <div className="shell bg-paper text-ink">
      <header className="shell-header bg-paper">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <Link to="/" className="font-serif text-ink text-[20px] font-normal tracking-tight">
                Wind Forecast
              </Link>
              <nav className="hidden md:flex items-center gap-5 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-ink-muted transition-colors font-medium ${
                      location.pathname === item.path
                        ? 'text-ink'
                        : 'hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[var(--radius)] border border-rule text-ink-muted hover:text-ink hover:bg-rule transition-colors bg-transparent"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="shell-main">{children}</main>
      <footer className="shell-footer">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-ink-muted text-[12px]">
          Wind Forecast Decision Portal &copy; 2026
        </div>
      </footer>
    </div>
  )
}
