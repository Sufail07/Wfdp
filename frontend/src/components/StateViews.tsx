interface ErrorStateProps {
  message: string
  onRetry?: () => void
  title?: string
}

export function ErrorState({ message, onRetry, title = 'Error' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h2 className="font-serif text-ink text-[20px] font-normal mb-2">{title}</h2>
      <p className="font-mono text-ink-muted text-sm mb-6 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Retry
        </button>
      )}
    </div>
  )
}

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ size = 'md' }: LoadingStateProps) {
  const height = size === 'sm' ? 'h-32' : size === 'lg' ? 'h-64' : 'h-48'
  return (
    <div className={`flex flex-col items-center justify-center ${height}`}>
      <div className="skeleton w-1/3" />
      <div className="skeleton-text w-3-4 mt-4" />
      <div className="skeleton-text w-full mt-2" />
    </div>
  )
}

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="font-mono text-ink-muted text-sm">{message}</p>
    </div>
  )
}
