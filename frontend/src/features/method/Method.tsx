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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Method & Data</h1>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'methodology', label: 'Methodology' },
            { id: 'assumptions', label: 'Assumptions' },
            { id: 'caveats', label: 'Caveats' },
            { id: 'data', label: 'Data Lineage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'methodology' && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h2>How It Works</h2>
            <p>
              This portal helps UK utility traders make wind generation decisions by showing the
              best available wind forecast at their decision cutoff time (D-1 09:00 London time).
            </p>
            <h3>Data Sources</h3>
            <ul className="list-disc pl-5 my-4">
              <li><strong>FUELHH</strong> - Half-hourly metered wind generation (actuals) from Elexon BM Reports</li>
              <li><strong>WINDFOR</strong> - Wind generation forecasts with multiple vintages from Elexon BM Reports</li>
            </ul>
            <h3>As-Of Forecast Selection</h3>
            <p>
              For each delivery day D, we identify the latest forecast published at or before the
              cutoff (D-1 09:00 London). This simulates what a trader would have known at decision time,
              avoiding look-ahead bias.
            </p>
            <h3>Error Convention</h3>
            <p>
              <strong>Positive error = over-forecast = shortfall risk for buyer.</strong>
              error_mw = forecast_mw - actual_mw. If you bought based on the forecast and actual
              wind is lower, you face a shortfall.
            </p>
          </div>
        )}

        {activeTab === 'assumptions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assumptions (A1-A6)</h2>
            {assumptions.map((a, i) => (
              <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-primary-600 dark:text-primary-400 font-mono text-sm">A{i + 1}</span>
                <span className="text-gray-700 dark:text-gray-300">{a}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'caveats' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Caveats</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                {caveats.join(' ')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Lineage</h2>
            {meta && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Coverage:</strong> {meta.coverage_start} to {meta.coverage_end}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Snapshot:</strong> {meta.snapshot_id}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Timezone:</strong> {meta.timezone}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Default Cutoff:</strong> {meta.default_cutoff_hour}:{String(meta.default_cutoff_minute).padStart(2, '0')} {meta.timezone}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Rows:</strong> {meta.row_counts.fuelhh.toLocaleString()} FUELHH, {meta.row_counts.windfor.toLocaleString()} WINDFOR
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