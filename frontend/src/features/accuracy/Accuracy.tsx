import { useState, useMemo } from 'react'
import { useMeta, useAccuracySummary, useAccuracyByHorizon, useAccuracyByHour, useAccuracyByWindLevel, useAccuracyDaily, useAccuracyErrorDistribution } from '../../api/client'
import { KpiNumeral } from '../../components/KpiNumeral'
import { BarChart, HistogramChart } from '../../components/charts'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/StateViews'
import { formatPercent, buildAccuracySummary, buildBiasLine, countDaysInRange, METRIC_TOOLTIPS, formatLondonDate } from '../../utils/format'

const DEFAULT_FROM = '2026-01-02'
const DEFAULT_TO = '2026-01-08'

// Horizon bucket labels in order (must match backend)
const HORIZON_BUCKETS = ['0-6h', '6-12h', '12-24h', '24-36h', '36-48h', '48h+']

// Short labels for horizon buckets
const HORIZON_LABELS: Record<string, string> = {
  '0-6h': '0–6h',
  '6-12h': '6–12h',
  '12-24h': '12–24h',
  '24-36h': '24–36h',
  '36-48h': '36–48h',
  '48h+': '48h+',
}

// Wind level labels (rebinned by forecast wind, stable terciles from full snapshot)
const WIND_LEVEL_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
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
  } = useAccuracyErrorDistribution(fromDate, toDate, undefined, undefined, 250)

  const metrics = summary?.metrics || {}
  const nDays = countDaysInRange(fromDate, toDate)
  const rangeSmallSample = nDays < 14

  const loading =
    metaLoading ||
    summaryLoading ||
    horizonLoading ||
    hourLoading ||
    windLoading ||
    dailyLoading ||
    distLoading

  // Build horizon data with ALL 6 buckets (empty ones shown as "no data")
  const horizonData = useMemo(() => {
    const byBucket = new Map(
      byHorizon?.results?.map((r: any) => [r.horizon_bucket, r]) || []
    )
    return HORIZON_BUCKETS.map((bucket) => {
      const r = byBucket.get(bucket)
      return {
        x: HORIZON_LABELS[bucket] ?? bucket,
        xRaw: bucket,
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

  // Build wind level data (rebinned by forecast wind)
  const windLevelData = useMemo(() => {
    const byLevelMap = new Map(
      byWindLevel?.results?.map((r: any) => [r.wind_level, r]) || []
    )
    return ['low', 'medium', 'high'].map((level) => {
      const r = byLevelMap.get(level)
      return {
        x: WIND_LEVEL_LABELS[level] || level,
        xRaw: level,
        y: r?.mae || 0,
        n: r?.n || 0,
        hasData: !!r,
      }
    })
  }, [byWindLevel])

  // Build daily data (bars)
  const dailyData = useMemo(() => {
    return (daily?.results?.map((r: any) => ({
      x: formatLondonDate(String(r.delivery_date || '')),
      y: r.mae || 0,
    })) || [])
  }, [daily])

  // Daily bias data (for overlay toggle)
  const dailyBiasData = useMemo(() => {
    return (daily?.results?.map((r: any) => ({
      x: formatLondonDate(String(r.delivery_date || '')),
      y: r.bias || 0,
    })) || [])
  }, [daily])

  // Error distribution histogram data
  const histBins = errorDist?.distribution?.histogram?.bins || []
  const histCounts = errorDist?.distribution?.histogram?.counts || []
  const histBinWidth = errorDist?.distribution?.bin_width ?? 250
  const quantiles = errorDist?.distribution?.quantiles || {}
  const p90All = quantiles?.p90
  const p95All = quantiles?.p95

  // Summary sentence uses P95 of ALL signed errors (not over-forecasts only)
  const summarySentence = buildAccuracySummary(fromDate, toDate, metrics.bias, p95All)
  const biasLine = buildBiasLine(metrics.bias)

  // Dynamic horizon trend sentence
  const horizonTrend = useMemo(() => {
    const validBuckets = horizonData.filter((d) => d.hasData && d.n > 0)
    if (validBuckets.length < 2) return 'Not enough buckets to compare.'

    const first = validBuckets[0]
    const last = validBuckets[validBuckets.length - 1]
    const change = ((last.y - first.y) / first.y) * 100

    if (change > 10) {
      return `MAE roughly rises with horizon: ${first.y.toFixed(0)} MW at ${first.xRaw} → ${last.y.toFixed(0)} MW at ${last.xRaw} (+${change.toFixed(0)}%).`
    } else if (change < -10) {
      return `MAE roughly falls with horizon: ${first.y.toFixed(0)} MW at ${first.xRaw} → ${last.y.toFixed(0)} MW at ${last.xRaw} (${change.toFixed(0)}%).`
    } else {
      return `No clear trend: MAE is ${first.y.toFixed(0)} MW at ${first.xRaw} and ${last.y.toFixed(0)} MW at ${last.xRaw} (${change.toFixed(0)}%).`
    }
  }, [horizonData])

  // Format snapshot date
  const snapshotDisplay = meta?.snapshot_id ? formatLondonDate(meta.snapshot_id) : ''

  // Small sample per-bar notice (bars with n < 30 half-hours)
  const barsWithFewSamples = [
    ...hourData.filter((d) => d.hasData && d.n > 0 && d.n < 30),
    ...windLevelData.filter((d) => d.hasData && d.n > 0 && d.n < 30),
  ]

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
                Source: Elexon BMRS · Snapshot fetched {snapshotDisplay} · {nDays} day(s)
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
          {/* Small-sample notices */}
          {rangeSmallSample && (
            <div className="card border border-over bg-surface">
              <p className="font-mono text-over text-sm">
                Small sample: {nDays} day(s) in range (under 14 days). Metrics may not be representative.
              </p>
            </div>
          )}
          {barsWithFewSamples.length > 0 && (
            <div className="card border border-over bg-surface">
              <p className="font-mono text-over text-sm">
                Small sample: {barsWithFewSamples.length} bar(s) rest on fewer than 30 half-hours. Treat with caution.
              </p>
            </div>
          )}

          {/* KPI strip - all error metrics in MW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiNumeral
              value={metrics.bias !== undefined ? metrics.bias.toFixed(0) : '--'}
              label="Bias"
              unit="MW"
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.bias}
              change={biasLine || undefined}
            />
            <KpiNumeral
              value={metrics.mae !== undefined ? metrics.mae.toFixed(0) : '--'}
              label="MAE"
              unit="MW"
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.mae}
            />
            <KpiNumeral
              value={metrics.rmse !== undefined ? metrics.rmse.toFixed(0) : '--'}
              label="RMSE"
              unit="MW"
              n={metrics.n}
              nDays={metrics.n_days}
              helpText={METRIC_TOOLTIPS.rmse}
            />
            <KpiNumeral
              value={metrics.nmae !== undefined ? (metrics.nmae * 100).toFixed(1) : '--'}
              label="nMAE"
              unit="%"
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
                  key={`daily-${showBiasOnDaily ? 'with-bias' : 'no-bias'}`}
                  data={dailyData}
                  series2={showBiasOnDaily ? dailyBiasData : undefined}
                  series2Name="Bias"
                  series2Color="--over"
                  height={320}
                />
                {showBiasOnDaily && (
                  <p className="text-xs font-mono text-ink-muted mt-2">
                    Solid bars = MAE · Line = signed daily bias (+ = over-forecast)
                  </p>
                )}
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Source: Elexon BMRS
              </p>
            </div>

            {/* Error distribution */}
            <div className="card">
              <h3 className="section-title">Error distribution (MW)</h3>
              <div className="relative">
                <HistogramChart
                  bins={histBins}
                  counts={histCounts}
                  bin_width={histBinWidth}
                  markers={[
                    { value: p90All ?? 0, label: `P90 all: ${Math.round(p90All ?? 0)} MW`, color: 'var(--over)' },
                    { value: p95All ?? 0, label: `P95 all: ${Math.round(p95All ?? 0)} MW`, color: 'var(--over)' },
                  ]}
                  height={320}
                />
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">
                Positive error = forecast above actual wind (shortfall risk). P90 of all signed errors:{p90All !== undefined ? ` ${Math.round(p90All)} MW` : '—'} · P95 of all signed errors:{p95All !== undefined ? ` ${Math.round(p95All)} MW` : '—'}.
              </p>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Source: Elexon BMRS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horizon - spans full width in two-col grid */}
            <div className="card lg:col-span-2">
              <h3 className="section-title">MAE by forecast horizon (MW)</h3>
              <div className="relative">
                <BarChart
                  data={horizonData}
                  height={320}
                />
              </div>
              <p className="text-xs font-mono text-ink-muted mt-2">{horizonTrend}</p>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Built from ALL WINDFOR vintages (publishTime &lt; startTime), bucketed by horizon = startTime - publishTime.
              </p>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Source: Elexon BMRS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                Source: Elexon BMRS
              </p>
            </div>

            {/* By wind level + Shortfall risk paired */}
            <div className="card flex flex-col gap-4">
              <div>
                <h3 className="section-title">MAE by wind level (MW)</h3>
                <div className="relative">
                  <BarChart
                    data={windLevelData.filter((d) => d.hasData)}
                    height={320}
                  />
                </div>
                {byWindLevel?.tercile_lower !== undefined && byWindLevel?.tercile_upper !== undefined && (
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    {'Binned by forecast wind (terciles from full snapshot): Low < '}
                    {Math.round(byWindLevel.tercile_lower!)}
                    {' MW, Medium '}
                    {Math.round(byWindLevel.tercile_lower!)}
                    {'–'}
                    {Math.round(byWindLevel.tercile_upper!)}
                    {' MW, High > '}
                    {Math.round(byWindLevel.tercile_upper!)}
                    {' MW.'}
                  </p>
                )}
                <p className="text-xs font-mono text-ink-muted mt-1">
                  Source: Elexon BMRS
                </p>
              </div>

              <div className="border-t border-rule pt-4">
                <h3 className="section-title" style={{ fontSize: '16px', marginBottom: '12px' }}>Shortfall risk</h3>
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
                    label="P95 over-forecasts only"
                    unit="MW"
                    n={metrics.n}
                    nDays={metrics.n_days}
                    helpText="P95 of positive (over-forecast) errors only — not the same as P95 of all errors"
                  />
                </div>
                <p className="text-xs font-mono text-ink-muted mt-2">
                  Positive error = forecast above actual wind = buyer faces shortfall. P95 of all errors (histogram):{p95All !== undefined ? ` ${Math.round(p95All)} MW` : '—'} · P95 of over-forecasts only:{metrics.tail_risk_p95_over_mw !== undefined ? ` ${Math.round(metrics.tail_risk_p95_over_mw)} MW` : '—'} (different metric).
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
