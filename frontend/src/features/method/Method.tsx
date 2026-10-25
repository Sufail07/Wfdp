import { useState } from 'react'
import { useMeta } from '../../api/client'
import { ErrorState } from '../../components/ErrorState'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

export function Method() {
  const [activeTab, setActiveTab] = useState('methodology')

  const {
    data: meta,
    isLoading,
    error,
  } = useMeta()

  const assumptions = meta?.assumptions || []
  const caveats = meta?.caveats || []

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="font-serif font-bold text-moment text-2xl mb-6 tracking-tight">Method &amp; Data</h1>

        <div className="flex gap-4 mb-6 border-b border-color">
          {[
            { id: 'methodology', label: 'Methodology' },
            { id: 'assumptions', label: 'Assumptions' },
            { id: 'caveats', label: 'Caveats' },
            { id: 'data', label: 'Data Lineage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                activeTab === tab.id
                  ? 'text-moment font-semibold border-b-2 border-moment'
                  : 'text-context hover:text-moment border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'methodology' && (
          <div className="max-w-none">
            <h2 className="font-serif font-semibold text-moment mb-3">How It Works</h2>
            <p className="mb-4">
              This portal helps UK utility traders make wind generation decisions by showing the
              best available wind forecast at their decision cutoff time (D-1 09:00 London time).
            </p>
            <h3 className="font-serif font-semibold text-moment mb-2">Data Sources</h3>
            <ul className="list-disc pl-5 my-4 font-mono text-context">
              <li className="mb-2"><strong className="text-moment">FUELHH</strong> - Half-hourly metered wind generation (actuals) from Elexon BM Reports</li>
              <li className="mb-2"><strong className="text-moment">WINDFOR</strong> - Wind generation forecasts with multiple vintages from Elexon BM Reports</li>
            </ul>
            <h3 className="font-serif font-semibold text-moment mb-2">As-Of Forecast Selection</h3>
            <p className="mb-4">
              For each delivery day D, we identify the latest forecast published at or before the
              cutoff (D-1 09:00 London). This simulates what a trader would have known at decision time,
              avoiding look-ahead bias.
            </p>
            <h3 className="font-serif font-semibold text-moment mb-2">Error Convention</h3>
            <p className="mb-4">
              <strong className="text-moment">Positive error = over-forecast = shortfall risk for buyer.</strong> error_mw = forecast_mw - actual_mw. If you bought based on the forecast and actual
              wind is lower, you face a shortfall.
            </p>
          </div>
        )}

        {activeTab === 'assumptions' && (
          <div className="space-y-3">
            <h2 className="font-serif font-semibold text-moment">Assumptions (A1-A6)</h2>
            {assumptions.map((a, i) => (
              <div key={i} className="flex gap-3 p-4 bg-surface rounded border border-color">
                <span className="font-mono font-semibold text-moment text-sm">A{i + 1}</span>
                <span className="font-mono text-context">{a}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'caveats' && (
          <div className="space-y-3">
            <h2 className="font-serif font-semibold text-moment">Caveats</h2>
            <div className="bg-surface border border-color p-4 rounded">
              <p className="font-mono text-context text-sm">
                {caveats.join(' ')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4">
            <h2 className="font-serif font-semibold text-moment">Data Lineage</h2>
            {meta && (
              <div className="bg-surface border border-color p-4 rounded">
                <p className="font-mono text-context text-sm mb-2">
                  <strong className="text-moment">Coverage:</strong> {meta.coverage_start} to {meta.coverage_end}
                </p>
                <p className="font-mono text-context text-sm mb-2">
                  <strong className="text-moment">Snapshot:</strong> {meta.snapshot_id}
                </p>
                <p className="font-mono text-context text-sm mb-2">
                  <strong className="text-moment">Timezone:</strong> {meta.timezone}
                </p>
                <p className="font-mono text-context text-sm mb-2">
                  <strong className="text-moment">Default Cutoff:</strong> {meta.default_cutoff_hour}:{String(meta.default_cutoff_minute).padStart(2, '0')} {meta.timezone}
                </p>
                <p className="font-mono text-context text-sm mb-2">
                  <strong className="text-moment">Rows:</strong> {meta.row_counts.fuelhh.toLocaleString()} FUELHH, {meta.row_counts.windfor.toLocaleString()} WINDFOR
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && <LoadingSkeleton className="h-48 w-full" />}
      {error && <ErrorState message={error.message} />}
    </div>
  )
}
