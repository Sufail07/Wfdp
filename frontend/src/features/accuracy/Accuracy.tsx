import React, { useState } from 'react'
import { useAccuracySummary, useAccuracyByHorizon, useAccuracyByHour, useAccuracyByWindLevel, useAccuracyDaily, useAccuracyErrorDistribution } from '../../api/client'
import { KPICard } from '../../components/KPICard'
import { LineChart, BarChart, HeatmapChart } from '../../components/charts'
import { ErrorState } from '../../components/ErrorState'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'
import { formatPercent, formatNumber } from '../../utils/format'

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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-1/3 space-y-4">
          <div className="card">
            <label className="label">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                min="2026-01-02"
                max="2026-02-01"
                className="input"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min="2026-01-02"
                max="2026-02-01"
                className="input"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Range filter updates all charts below
            </p>
          </div>
        </div>

        <div className="lg:w-2/3 space-y-6">
          {loading && (
            <div className="h-[600px]">
              <LoadingSkeleton className="h-8 w-full mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <LoadingSkeleton className="h-32" />
                <LoadingSkeleton className="h-32" />
              </div>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Error Series</h3>
                  <LineChart
                    data={daily?.results?.map((r: any) => ({
                      x: String(r.delivery_date || ''),
                      y: r.mae || 0,
                    })) || []}
                    title="Daily MAE"
                    yAxisLabel="MW"
                    height={300}
                  />
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Error Distribution</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      P90: {errorDist?.distribution?.quantiles?.p90 !== undefined ? errorDist.distribution.quantiles.p90.toFixed(1) : '--'} MW
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      P95: {errorDist?.distribution?.quantiles?.p95 !== undefined ? errorDist.distribution.quantiles.p95.toFixed(1) : '--'} MW
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      P99: {errorDist?.distribution?.quantiles?.p99 !== undefined ? errorDist.distribution.quantiles.p99.toFixed(1) : '--'} MW
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accuracy by Horizon</h3>
                  <BarChart
                    data={byHorizon?.results?.map((r: any) => ({
                      x: r.horizon_bucket || 'Unknown',
                      y: r.mae || 0,
                    })) || []}
                    title="MAE by Forecast Horizon"
                    yAxisLabel="MW"
                    height={300}
                  />
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accuracy by Hour</h3>
                  <BarChart
                    data={byHour?.results?.map((r: any) => ({
                      x: r.hour_of_day || 0,
                      y: r.mae || 0,
                    })) || []}
                    title="MAE by Hour of Day"
                    yAxisLabel="MW"
                    height={300}
                  />
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accuracy by Wind Level</h3>
                  <BarChart
                    data={byWindLevel?.results?.map((r: any) => ({
                      x: r.wind_level || 'Unknown',
                      y: r.mae || 0,
                    })) || []}
                    title="MAE by Wind Level"
                    yAxisLabel="MW"
                    height={300}
                  />
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Over-Forecast Share</h3>
                <KPICard
                  value={metrics.over_forecast_share !== undefined ? formatPercent(metrics.over_forecast_share) : '--'}
                  label="Share of forecasts that over-estimated wind"
                />
                <KPICard
                  value={metrics.tail_risk_p95_over_mw !== undefined ? metrics.tail_risk_p95_over_mw.toFixed(0) : '--'}
                  label="P95 Over-Forecast MW (Tail Risk)"
                  unit="MW"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}