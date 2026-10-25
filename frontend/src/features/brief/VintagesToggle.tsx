
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
          <p className="text-sm font-mono text-moment">Show Earlier Vintages</p>
          <p className="text-caption text-context mt-1">
            View forecast revisions from earlier publish times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-caption px-2 py-1 rounded font-mono ${enabled ? 'bg-surface text-moment' : 'bg-surface text-context border border-color'}`}>
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
        <p className="mt-2 text-caption text-context">
          {vintageCount} vintage(s) available
        </p>
      )}
    </div>
  )
}
