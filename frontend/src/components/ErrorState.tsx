
interface ErrorStateProps {
  message: string
  onRetry?: () => void
  title?: string
}

export function ErrorState({ message, onRetry, title = 'Error' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M60 12V9c0-1.7-.5-3.4-1.4-4.8L55.4 7.1c-1.1-1-2.5-1.5-3.9-1H60c-1.4 0-2.8.2-4 .5L12.6 14.4c-.7.9-1 2.1-1 3.4V18c0 1.7.5 3.4 1.4 4.8l11.8 6.5c1.1 1 2.5 1.5 3.9 1H12c1.4 0 2.8-.2 4-.5L46.6 26.6c.7-.9 1-2.1 1-3.4V20c0-1.7-.5-3.4-1.4-4.8z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 btn-primary"
        >
          Retry
        </button>
      )}
    </div>
  )
}