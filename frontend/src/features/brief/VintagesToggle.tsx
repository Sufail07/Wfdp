import React from 'react'

interface VintagesToggleProps {
  enabled: boolean
  onToggle: () => void
  vintageCount?: number
}

export function VintagesToggle({ enabled, onToggle, vintageCount }: VintagesToggleProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Show Earlier Vintages</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            View forecast revisions from earlier publish times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
            {enabled ? 'On' : 'Off'}
          </span>
          <button
            onClick={onToggle}
            className="btn-secondary text-xs"
          >
            Toggle
          </button>
        </div>
      </div>
      {vintageCount !== undefined && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {vintageCount} vintage(s) available
        </p>
      )}
    </div>
  )
}