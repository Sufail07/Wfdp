import { useState, useMemo } from 'react'
import { useMeta, useAccuracySummary, useAccuracyByHorizon, useAccuracyByHour, useAccuracyByWindLevel, useAccuracyDaily, useAccuracyErrorDistribution } from '../../api/client'
import { KpiNumeral } from '../../components/KpiNumeral'
import { BarChart, HistogramChart } from '../../components/charts'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/StateViews'
import { formatPercent, buildAccuracySummary, buildBiasLine, countDaysInRange, METRIC_TOOLTIPS } from '../../utils/format'

const DEFAULT_FROM = '2026-01-02'
const DEFAULT_TO = '2026-01-08'

// Horizon bucket labels in order (must match backend)
const HORIZON_BUCKETS = ['0-6h', '6-12h', '12-24h', '24-36h', '36-48h', '48h+']

// Wind level labels with MW ranges (approximate, from terciles of actualMW)
const WIND_LEVEL_LABELS: Record<string, string> = {
  low: 'Low (0 – ~5,500 MW)',
  medium: 'Medium (~5,500 – ~7,500 MW)',
  high: 'High (~7,500+ MW)',
}

export function Accuracy() {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [showBiasOnDaily, setShowBiasOnDaily] = useState(false)

  const {
    data: meta,
    isLoading: metaLoading,
  } = useMeta()

  const minDate = meta?.coverage_start || DEFAULT_FROM
  const maxDate = meta?.coverage_end || DEFAULT_TO

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

  const loading = metaLoading || summaryLoading || horizonLoading || hourLoading || windLoading || dailyLoading || distLoading

  const metrics = summary?.metrics || {}
  const nDays = countDaysInRange(fromDate, toDate)
  const isSmallSample = nDays < 7

  // Build horizon data with all 6 buckets (empty buckets shown as n=0)
  const horizonData = useMemo(() => {
    const byBucket = new Map(
      byHorizon?.results?.map((r: any) => [r.horizon_bucket, r]) || []
    )
    return HORIZON_BUCKETS.map((bucket) => {
      const r = byBucket.get(bucket)
      return {
        x: bucket,
        y: r?.mae || 0,
        n: r?.n || 0,
        hasData: !!r,
      }
    })
  }, [byHorizon])

  // Build by-hour data (0-23)
  const hourData = useMemo(() => {
    const byHourMap = new Map(
      byHour?.results?.map((r: any) => [r.hour_of_day, r]) || []
    )
    return Array.from({ length: 24 }, (_, h) => {
      const r = byHourMap.get(h)
      return {
        x: String(h),
        y: r?.mae || 0,
        n: r?.n || 0,
        hasData: !!r,
      }
    })
  }, [byHour])

  // Build wind level data
  const windLevelData = useMemo(() => {
    const byLevelMap = new Map(
      byWindLevel?.results?.map((r: any) => [r.wind_level, r]) || []
    )
    return ['low', 'medium', 'high'].map((level) => {
      const r = byLevelMap.get(level)
      return {
        x: WIND_LEVEL_LABELS[level] || level,
        y: r?.mae || 0,
        n: r?.n || 0,
        hasData: !!r,
      }
    })
  }, [byWindLevel])

  // Build daily data (bars)
  const dailyData = useMemo(() => {
    return (daily?.results?.map((r: any) => ({
      x: String(r.delivery_date || ''),
      y: r.mae || 0,
    })) || [])
  }, [daily])

  // Daily bias data (for overlay toggle)
  const dailyBiasData = useMemo(() => {
    return (daily?.results?.map((r: any) => ({
      x: String(r.delivery_date || ''),
      y: r.bias || 0,
    })) || [])
  }, [daily])

  // Error distribution histogram data
  const histBins = errorDist?.distribution?.histogram?.bins || []
  const histCounts = errorDist?.distribution?.histogram?.counts || []
  const quantiles = errorDist?.distribution?.quantiles || {}
  const p90 = quantiles?.p90
  const p95 = quantiles?.p95

  // Summary sentence
  const summarySentence = buildAccuracySummary(fromDate, toDate, metrics.bias, metrics.tail_risk_p95_over_mw)
  const biasLine = buildBiasLine(metrics.bias)

  return (
    <div className="space-y-8">
      {/* Header with summary sentence */}
      <div className="card">
        <div className="space-y-3">
          <h1 className="page-title">Forecast Accuracy</h1>
          <p className="page-subtitle">{summarySentence}</p>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="input w-48"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="input w-48"
              />
            </div>
            {meta && (
              <p className="text-xs font-mono text-ink-muted mt-2 lg:mt-0">
                Data: Elexon BMRS · Snapshot fetched {meta.snapshot_id} · Actuals as of fetch date
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="h-[600px] flex flex-col gap-4">
          <LoadingState size="lg" />
        </div>
      )}

      {summaryError && <ErrorState message={summaryError.message} />}

      {!loading && summary && !summaryError && (
        <>
          {/* Small-sample notice */}
          {isSmallSample && (
            <div className="card border border-over bg-surface">
              <p className="font-mono text-over text-sm">
                Small sample: {nDays} day(s) in range. Metrics may not be representative.
              </p>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiNumeral
              value={metrics.bias !== undefined ? (Math.abs(metrics.bias) >= 1000 ? (metrics.bias / 1000).toFixed(1) : metrics.bias.toFixed(0)) : '--'}
              label="Bias"
              unit={metrics.bias !== undefined && Math.abs(metrics.bias) >= 1000 ? 'GW' : 'MW'}
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.bias}
              change={biasLine || undefined}
            />
            <KpiNumeral
              value={metrics.mae !== undefined ? (Math.abs(metrics.mae) >= 1000 ? (metrics.mae / 1000).toFixed(1) : metrics.mae.toFixed(0)) : '--'}
              label="MAE"
              unit={metrics.mae !== undefined && Math.abs(metrics.mae) >= 1000 ? 'GW' : 'MW'}
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.mae}
            />
            <KpiNumeral
              value={metrics.rmse !== undefined ? (Math.abs(metrics.rmse) >= 1000 ? (metrics.rmse / 1000).toFixed(1) : metrics.rmse.toFixed(0)) : '--'}
              label="RMSE"
              unit={metrics.rmse !== undefined && Math.abs(metrics.rmse) >= 1000 ? 'GW' : 'MW'}
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.rmse}
            />
            <KpiNumeral
              value={metrics.nmae !== undefined ? metrics.nmae.toFixed(3) : '--'}
              label="nMAE"
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.nmae}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Daily mean absolute error (MW)</h3>
                <button
                  onClick={() => setShowBiasOnDaily((prev) => !prev)}
                  className="btn text-xs"
                >
                  {showBiasOnDaily ? 'Hide bias' : 'Show bias'}
                </button>
              </div>
              <div className="relative">
                <BarChart
                  data={dailyData}
                  series2={showBiasOnDaily ? dailyBiasData : undefined}
                  series2Name="Bias"
                  series2Color="var(--over)"
                  height={320}
                />
                {showBiasOnDaily && (
                  <p className="text-xs font-mono text-ink-muted mt-2">
                    Solid bars = MAE · Line = signed daily bias (positive = over-forecast)
                  </p>
                )}
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Source: Elexon BMRS · Snapshot {meta?.snapshot_id} · Actuals as of fetch date
              </p>
            </div>

            {/* Error distribution */}
            <div className="card">
              <h3 className="section-title">Error distribution (MW)</h3>
              <div className="relative">
                <HistogramChart
                  bins={histBins}
                  counts={histCounts}
                  zeroLine={true}
                  markers={[
                    { value: p90 ?? 0, label: `P90: ${Math.round(p90 ?? 0)} MW`, color: 'var(--over)' },
                    { value: p95 ?? 0, label: `P95: ${Math.round(p95 ?? 0)} MW`, color: 'var(--over)' },
                  ]}
                  height={320}
                />
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Positive error = forecast above actual wind (shortfall risk). P90:{p90 !== undefined ? ` ${Math.round(p90)} MW` : '—'} · P95:{p95 !== undefined ? ` ${Math.round(p95)} MW` : '—'} (all signed errors).{p95 !== undefined ? ` Tail risk P95 (over-forecasts only): ${Math.round(metrics.tail_risk_p95_over_mw ?? 0)} MW.` : ''}
              </p>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Source: Elexon BMRS · Snapshot {meta?.snapshot_id} · Actuals as of fetch date
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Horizon */}
            <div className="card lg:col-span-2">
              <h3 className="section-title">MAE by forecast horizon (MW)</h3>
              <div className="relative">
                <BarChart
                  data={horizonData.filter((d) => d.hasData)}
                  height={320}
                />
                {horizonData.some((d) => !d.hasData) && (
                  <p className="text-xs font-mono text-ink-muted mt-2">
                    Empty buckets (0-6h, 6-12h) have no forecast vintages in this range.
                  </p>
                )}
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Built from ALL WINDFOR vintages (publishTime &lt; startTime), bucketed by horizon = startTime − publishTime.
                MAE does not consistently rise with horizon in this sample.
              </p>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Source: Elexon BMRS · Snapshot {meta?.snapshot_id} · Actuals as of fetch date
              </p>
            </div>

            {/* By hour */}
            <div className="card">
              <h3 className="section-title">MAE by hour of day, London time (MW)</h3>
              <div className="relative">
                <BarChart
                  data={hourData.filter((d) => d.hasData)}
                  height={320}
                />
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Source: Elexon BMRS · Snapshot {meta?.snapshot_id} · Actuals as of fetch date
              </p>
            </div>

            {/* By wind level */}
            <div className="card">
              <h3 className="section-title">MAE by wind level (MW)</h3>
              <div className="relative">
                <BarChart
                  data={windLevelData.filter((d) => d.hasData)}
                  height={320}
                />
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Terciles of actualMW. Source: Elexon BMRS · Snapshot {meta?.snapshot_id} · Actuals as of fetch date
              </p>
            </div>
          </div>

          {/* Shortfall risk block */}
          <div className="card">
            <h3 className="section-title">Shortfall risk</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiNumeral
                value={metrics.over_forecast_share !== undefined ? formatPercent(metrics.over_forecast_share) : '--'}
                label="Over-forecast share"
                n={metrics.n}
                nDays={metrics.n_days}
                helpText="Share of half-hours where forecast was above actual wind (shortfall risk for buyer)"
              />
              <KpiNumeral
                value={metrics.tail_risk_p95_over_mw !== undefined ? metrics.tail_risk_p95_over_mw.toFixed(0) : '--'}
                label="P95 over-forecast"
                unit="MW"
                n={metrics.n}
                nDays={metrics.n_days}
                helpText="P95 of positive (over-forecast) errors"
              />
            </div>
            <p className="text-xs font-mono text-ink-muted mt-2">
              Positive error = forecast above actual wind = buyer faces shortfall. P95 definition matches Error Distribution card.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
