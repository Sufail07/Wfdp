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
    <div className="space-y-8">
      <div className="card">
        <div className="space-y-1">
          <h1 className="page-title">Method &amp; Data</h1>
          <p className="page-subtitle">How the Wind Forecast Decision Portal works and where the data comes from.</p>
        </div>

        <div className="mt-6 flex gap-1 border-b border-color">
          {[
            { id: 'methodology', label: 'Methodology' },
            { id: 'assumptions', label: 'Assumptions' },
            { id: 'caveats', label: 'Caveats' },
            { id: 'data', label: 'Data Lineage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-mono font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-moment border-b-2 border-moment pb-2.5'
                  : 'text-context hover:text-moment border-b-2 border-transparent pb-2.5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'methodology' && (
          <div className="mt-6 max-w-none space-y-6">
            <div className="space-y-3">
              <h2 className="font-serif font-semibold text-moment text-lg">How It Works</h2>
              <p className="font-mono text-context text-sm leading-relaxed">
                This portal helps UK utility traders make wind generation decisions by showing the best available wind
                forecast at their decision cutoff time (D-1 09:00 London time).
              </p>
            </div>

            <div className="bg-surface border border-color rounded-lg p-5">
              <h3 className="font-serif font-semibold text-moment text-sm mb-3 uppercase tracking-wider">Data Sources</h3>
              <ul className="list-disc pl-6 font-mono text-context text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="font-semibold text-moment">FUELHH</span>
                  <span>Half-hourly metered wind generation (actuals) from Elexon Insights API</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-moment">WINDFOR</span>
                  <span>Wind generation forecasts with multiple vintages from Elexon Insights API</span>
                </li>
              </ul>
            </div>

            <div className="bg-surface border border-color rounded-lg p-5 mt-4">
              <h3 className="font-serif font-semibold text-moment text-sm mb-3 uppercase tracking-wider">As-Of Forecast Selection</h3>
              <p className="font-mono text-context text-sm leading-relaxed">
                For each delivery day D, we identify the latest forecast published at or before the cutoff (D-1 09:00
                London). This simulates what a trader would have known at decision time, avoiding look-ahead bias.
              </p>
            </div>

            <div className="bg-surface border border-color rounded-lg p-5 mt-4">
              <h3 className="font-serif font-semibold text-moment text-sm mb-3 uppercase tracking-wider">Error Convention</h3>
              <p className="font-mono text-context text-sm leading-relaxed">
                <span className="font-semibold text-moment">Positive error = over-forecast = shortfall risk for buyer.</span>
                error_mw = forecast_mw - actual_mw. If you bought based on the forecast and actual wind is lower, you
                face a shortfall.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'assumptions' && (
          <div className="mt-6 space-y-3">
            <h2 className="font-serif font-semibold text-moment text-lg">Assumptions (A1-A6)</h2>
            {assumptions.map((a, i) => (
              <div key={i} className="flex gap-3 p-4 bg-surface rounded border border-color">
                <span className="font-mono font-semibold text-moment text-sm shrink-0">A{i + 1}</span>
                <span className="font-mono text-context text-sm">{a}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'caveats' && (
          <div className="mt-6 space-y-3">
            <h2 className="font-serif font-semibold text-moment text-lg">Caveats</h2>
            <div className="bg-surface border border-color rounded-lg p-5">
              <p className="font-mono text-context text-sm leading-relaxed">{caveats.join(' ')}</p>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="mt-6 space-y-4">
            <h2 className="font-serif font-semibold text-moment text-lg">Data Lineage</h2>
            {meta && (
              <div className="bg-surface border border-color rounded-lg p-5">
                <p className="font-mono text-context text-sm leading-relaxed mb-2">
                  <span className="font-semibold text-moment">Coverage:</span> {meta.coverage_start} to {meta.coverage_end}
                </p>
                <p className="font-mono text-context text-sm leading-relaxed mb-2">
                  <span className="font-semibold text-moment">Snapshot:</span> {meta.snapshot_id}
                </p>
                <p className="font-mono text-context text-sm leading-relaxed mb-2">
                  <span className="font-semibold text-moment">Timezone:</span> {meta.timezone}
                </p>
                <p className="font-mono text-context text-sm leading-relaxed mb-2">
                  <span className="font-semibold text-moment">Default Cutoff:</span> {meta.default_cutoff_hour}:{String(meta.default_cutoff_minute).padStart(2, '0')} {meta.timezone}
                </p>
                <p className="font-mono text-context text-sm leading-relaxed mb-2">
                  <span className="font-semibold text-moment">Rows:</span> {meta.row_counts.fuelhh.toLocaleString()} FUELHH, {meta.row_counts.windfor.toLocaleString()} WINDFOR
                </p>
                {meta.data_source && (
                  <p className="font-mono text-context text-sm leading-relaxed mb-2">
                    <span className="font-semibold text-moment">Data Source:</span> {meta.data_source}
                  </p>
                )}
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
