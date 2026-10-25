import { useState } from 'react'
import { useAccuracySummary, useAccuracyByHorizon, useAccuracyByHour, useAccuracyByWindLevel, useAccuracyDaily, useAccuracyErrorDistribution } from '../../api/client'
import { KPICard } from '../../components/KPICard'
import { LineChart, BarChart } from '../../components/charts'
import { ErrorState } from '../../components/ErrorState'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { formatPercent } from '../../utils/format'

const DEFAULT_FROM = '2026-01-02'
const DEFAULT_TO = '2026-01-08'

export function Accuracy() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useAccuracySummary({ from_date: fromDate, to_date: toDate })

  const {
    data: byHorizon,
    isLoading: horizonLoading,
  } = useAccuracyByHorizon(fromDate, toDate)

  const {
    data: byHour,
    isLoading: hourLoading,
  } = useAccuracyByHour(fromDate, toDate)

  const {
    data: byWindLevel,
    isLoading: windLoading,
  } = useAccuracyByWindLevel(fromDate, toDate)

  const {
    data: daily,
    isLoading: dailyLoading,
  } = useAccuracyDaily(fromDate, toDate)

  const {
    data: errorDist,
    isLoading: distLoading,
  } = useAccuracyErrorDistribution(fromDate, toDate)

  const loading = summaryLoading || horizonLoading || hourLoading || windLoading || dailyLoading || distLoading

  const metrics = summary?.metrics || {}

  return (
    <div className="space-y-8">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="space-y-2">
            <h1 className="page-title">Forecast Accuracy</h1>
            <p className="page-subtitle">
              {fromDate} to {toDate} &middot; Range filter updates all charts below
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              min="2026-01-02"
              max="2026-02-01"
              className="input w-48"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min="2026-01-02"
              max="2026-02-01"
              className="input w-48"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="h-[600px] flex flex-col gap-4">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton className="h-40 w-full" />
          <LoadingSkeleton className="h-40 w-1/2 mt-4" />
          <LoadingSkeleton className="h-40 w-1/3 mt-4" />
        </div>
      )}

      {summaryError && <ErrorState message={summaryError.message} />}

      {!loading && summary && !summaryError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard value={metrics.bias !== undefined ? metrics.bias.toFixed(1) : '--'} label="Bias" unit="MW" />
            <KPICard value={metrics.mae !== undefined ? metrics.mae.toFixed(1) : '--'} label="MAE" unit="MW" />
            <KPICard value={metrics.rmse !== undefined ? metrics.rmse.toFixed(1) : '--'} label="RMSE" unit="MW" />
            <KPICard value={metrics.nmae !== undefined ? formatPercent(metrics.nmae) : '--'} label="nMAE" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card lg:col-span-1">
              <h3 className="section-title">Daily Error Series</h3>
              <div className="h-[320px]">
                <LineChart
                  data={daily?.results?.map((r: any) => ({
                    x: String(r.delivery_date || ''),
                    y: r.mae || 0,
                  })) || []}
                  title="Daily MAE"
                  yAxisLabel="MW"
                  height={320}
                />
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="section-title">Error Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-context text-sm">P90:</span>
                  <span className="font-mono text-moment text-sm tabular-nums">
                    {errorDist?.distribution?.quantiles?.p90 !== undefined ? errorDist.distribution.quantiles.p90.toFixed(1) : '--'} MW
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-context text-sm">P95:</span>
                  <span className="font-mono text-moment text-sm tabular-nums">
                    {errorDist?.distribution?.quantiles?.p95 !== undefined ? errorDist.distribution.quantiles.p95.toFixed(1) : '--'} MW
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-context text-sm">P99:</span>
                  <span className="font-mono text-moment text-sm tabular-nums">
                    {errorDist?.distribution?.quantiles?.p99 !== undefined ? errorDist.distribution.quantiles.p99.toFixed(1) : '--'} MW
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="card lg:col-span-2">
              <h3 className="section-title">Accuracy by Forecast Horizon</h3>
              <div className="h-[320px]">
                <BarChart
                  data={byHorizon?.results?.map((r: any) => ({
                    x: r.horizon_bucket || 'Unknown',
                    y: r.mae || 0,
                  })) || []}
                  title="MAE by Horizon"
                  yAxisLabel="MW"
                  height={320}
                />
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">Accuracy by Hour</h3>
              <div className="h-[320px]">
                <BarChart
                  data={byHour?.results?.map((r: any) => ({
                    x: r.hour_of_day || 0,
                    y: r.mae || 0,
                  })) || []}
                  title="MAE by Hour"
                  yAxisLabel="MW"
                  height={320}
                />
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">Accuracy by Wind Level</h3>
              <div className="h-[320px]">
                <BarChart
                  data={byWindLevel?.results?.map((r: any) => ({
                    x: r.wind_level || 'Unknown',
                    y: r.mae || 0,
                  })) || []}
                  title="MAE by Wind Level"
                  yAxisLabel="MW"
                  height={320}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Over-Forecast Share</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                value={metrics.over_forecast_share !== undefined ? formatPercent(metrics.over_forecast_share) : '--'}
                label="Share that over-estimated wind"
              />
              <KPICard
                value={metrics.tail_risk_p95_over_mw !== undefined ? metrics.tail_risk_p95_over_mw.toFixed(0) : '--'}
                label="P95 Over-Forecast MW"
                unit="MW"
                change={metrics.tail_risk_p95_over_mw !== undefined ? (metrics.tail_risk_p95_over_mw > 50 ? '+High' : '+Normal') : undefined}
                trend={metrics.tail_risk_p95_over_mw !== undefined ? (metrics.tail_risk_p95_over_mw > 50 ? 'down' : 'neutral') : undefined}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
