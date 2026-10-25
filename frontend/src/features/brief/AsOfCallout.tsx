
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
    <div className="card bg-surface border-color">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-moment flex items-center justify-center text-white flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="font-serif font-semibold text-moment text-sm">
            At {cutoffHour.toString().padStart(2, '0')}:{cutoffMinute.toString().padStart(2, '0')} on {deliveryDate}
          </p>
          <p className="font-mono text-context text-sm">
            You would have used the forecast published at {publishedAt}. {moveText}
          </p>
        </div>
      </div>
    </div>
  )
}
