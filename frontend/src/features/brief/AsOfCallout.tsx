import React from 'react'

interface AsOfCalloutProps {
  deliveryDate: string
  cutoffHour: number
  cutoffMinute: number
  publishedAt: string
  forecastMW: number
  laterMW?: number
  moveMW?: number
}

export function AsOfCallout({
  deliveryDate,
  cutoffHour,
  cutoffMinute,
  publishedAt,
  forecastMW,
  laterMW,
  moveMW,
}: AsOfCalloutProps) {
  const moveText = laterMW !== undefined && moveMW !== undefined
    ? `It later moved by ${moveMW > 0 ? '+' : ''}${moveMW.toFixed(0)} MW (from ${forecastMW.toFixed(0)} to ${laterMW.toFixed(0)} MW).`
    : ''

  return (
    <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            At {cutoffHour.toString().padStart(2, '0')}:{cutoffMinute.toString().padStart(2, '0')} on {deliveryDate}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            You would have used the forecast published at {publishedAt}. {moveText}
          </p>
        </div>
      </div>
    </div>
  )
}