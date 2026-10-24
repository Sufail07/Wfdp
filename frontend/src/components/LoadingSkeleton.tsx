import React from 'react'

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 h-8 w-full ${className}`} />
  )
}

export function LoadingSkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 h-4 ${className} ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 ${className}`} />
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LoadingSkeleton className="w-48 h-8" />
        <LoadingSkeleton className="w-24 h-8" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <LoadingSkeletonText key={i} lines={2} />
        ))}
      </div>
    </div>
  )
}