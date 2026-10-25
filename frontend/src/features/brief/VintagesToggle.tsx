
interface VintagesToggleProps {
  enabled: boolean
  onToggle: () => void
  vintageCount?: number
}

export function VintagesToggle({ enabled, onToggle, vintageCount }: VintagesToggleProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono font-semibold text-moment">Show Earlier Vintages</p>
          <p className="text-xs font-mono text-context mt-1">
            View forecast revisions from earlier publish times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-semibold px-2.5 py-1.5 rounded border ${enabled ? 'bg-surface text-moment border-moment' : 'bg-surface text-context border-color'}`}>
            {enabled ? 'On' : 'Off'}
          </span>
          <button
            onClick={onToggle}
            className="btn text-xs"
          >
            Toggle
          </button>
        </div>
      </div>
      {vintageCount !== undefined && (
        <p className="mt-3 text-xs font-mono text-context">
          {vintageCount} vintage(s) available
        </p>
      )}
    </div>
  )
}
