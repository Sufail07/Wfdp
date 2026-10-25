import { useState, useMemo, useEffect } from 'react'
import { useMeta, useDecisionForecast, useForecastRevisions, useRiskBand } from '../../api/client'
import { TimeChart } from '../../components/TimeChart'
import { KpiNumeral } from '../../components/KpiNumeral'
import { AsOfStatement } from '../../components/AsOfStatement'
import { formatLondonTime } from '../../utils/format'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/StateViews'

const DEFAULT_DATE = '2026-01-02'

export function DecisionBrief() {
  const [deliveryDate] = useState(DEFAULT_DATE)
  const [cutoffHour, setCutoffHour] = useState(9)
  const [cutoffMinute, setCutoffMinute] = useState(0)

  const {
    data: meta,
  } = useMeta()

  useEffect(() => {
    if (meta?.default_cutoff_hour !== undefined) setCutoffHour(meta.default_cutoff_hour)
    if (meta?.default_cutoff_minute !== undefined) setCutoffMinute(meta.default_cutoff_minute)
  }, [meta])

  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
  } = useDecisionForecast({
    delivery_date: deliveryDate,
    cutoff_hour: cutoffHour,
    cutoff_minute: cutoffMinute,
  })

  const {
    data: _revisions,
    isLoading: revisionsLoading,
  } = useForecastRevisions(deliveryDate, 5)

  const {
    data: riskBand,
    isLoading: riskLoading,
  } = useRiskBand({
    delivery_date: deliveryDate,
    cutoff_hour: cutoffHour,
    cutoff_minute: cutoffMinute,
  })

  const riskAdjustedSeries = useMemo(() => {
    if (!riskBand?.risk_adjusted) return []
    return riskBand.risk_adjusted.map((p) => ({
      x: p.startTime,
      y: p.riskAdjustedMW,
    }))
  }, [riskBand])

  const forecastSeries = useMemo(() => {
    if (!forecast?.forecasts) return []
    return forecast.forecasts.map((f) => ({
      x: f.startTime,
      y: f.forecastMW,
    }))
  }, [forecast])

  const spark = forecastSeries.slice(0, 12).map((d) => d.y)
  const published = forecast?.forecast_published_at ? formatLondonTime(forecast.forecast_published_at, 'HH:mm') : undefined
  const cutoffLabel = `${cutoffHour.toString().padStart(2, '0')}:${cutoffMinute.toString().padStart(2, '0')} cutoff · D-1`
  
  const cutoffDate = forecast?.cutoff_utc ? formatLondonTime(forecast.cutoff_utc, 'yyyy-MM-dd') : deliveryDate
  const meanMW = forecast?.mean_mw
  let valueText = '--'
  let unitText = 'GW'
  if (meanMW !== undefined && meanMW !== null) {
    if (Math.abs(meanMW) >= 1000) {
      valueText = (meanMW / 1000).toFixed(1)
      unitText = 'GW'
    } else {
      valueText = meanMW.toFixed(0)
      unitText = 'MW'
    }
  }
  const sentence = forecast?.forecasts?.length
    ? `you expected ${valueText} ${unitText} of wind on average on ${deliveryDate}.`
    : ''

  const series = [
    { name: 'Decision Forecast', data: forecastSeries, color: 'var(--accent)', lineStyle: { width: 1.5 } },
  ]
  if (riskAdjustedSeries.length > 0) {
    series.push({ name: 'Risk-Adjusted (P90)', data: riskAdjustedSeries, color: 'var(--ink-muted)', lineStyle: { width: 1, opacity: 0.7 } as any })
  }

  return (
    <div className="space-y-6">
      <AsOfStatement
        asOf={`As of ${cutoffHour.toString().padStart(2, '0')}:${cutoffMinute.toString().padStart(2, '0')}, ${cutoffDate}`}
        sentence={sentence}
        publishedAt={published}
        cutoffUtc={forecast?.cutoff_utc ? formatLondonTime(forecast?.cutoff_utc, 'HH:mm') : undefined}
      />

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <label className="label">Cutoff Time (London)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-context">Hour</span>
            <input
              type="number"
              value={cutoffHour}
              min={0}
              max={23}
              onChange={(e) => setCutoffHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
              className="w-20 input"
            />
            <span className="text-xs font-mono font-semibold text-context">Minute</span>
            <input
              type="number"
              value={cutoffMinute}
              min={0}
              max={59}
              onChange={(e) => setCutoffMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-20 input"
            />
          </div>
          <p className="text-xs font-mono text-context-light">
            Default: {meta?.default_cutoff_hour?.toString().padStart(2, '0') || '09'}:{meta?.default_cutoff_minute?.toString().padStart(2, '0') || '00'}
          </p>
        </div>
      </div>

      {(forecastLoading || revisionsLoading || riskLoading) && <LoadingState size="lg" />}
      {forecastError && <ErrorState message={forecastError.message} />}

      {!forecastLoading && !forecastError && forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9">
            <TimeChart series={series} showCutoff={true} cutoffLabel={cutoffLabel} height={460} />
          </div>
          <div className="lg:col-span-3 space-y-3">
            <KpiNumeral value={forecast.total_expected_mwh ? (Math.abs(forecast.total_expected_mwh) >= 1000 ? (forecast.total_expected_mwh / 1000).toFixed(0) : forecast.total_expected_mwh.toFixed(0)) : '--'} unit={forecast.total_expected_mwh && Math.abs(forecast.total_expected_mwh) >= 1000 ? 'GWh' : 'MWh'} label="Total" sparkline={spark} />
            <KpiNumeral value={forecast.peak_mw ? (Math.abs(forecast.peak_mw) >= 1000 ? (forecast.peak_mw / 1000).toFixed(1) : forecast.peak_mw.toFixed(0)) : '--'} unit={forecast.peak_mw && Math.abs(forecast.peak_mw) >= 1000 ? 'GW' : 'MW'} label="Peak" sparkline={spark} />
            <KpiNumeral value={forecast.min_mw ? (Math.abs(forecast.min_mw) >= 1000 ? (forecast.min_mw / 1000).toFixed(1) : forecast.min_mw.toFixed(0)) : '--'} unit={forecast.min_mw && Math.abs(forecast.min_mw) >= 1000 ? 'GW' : 'MW'} label="Min" sparkline={spark} />
            <KpiNumeral value={forecast.mean_mw ? (Math.abs(forecast.mean_mw) >= 1000 ? (forecast.mean_mw / 1000).toFixed(1) : forecast.mean_mw.toFixed(0)) : '--'} unit={forecast.mean_mw && Math.abs(forecast.mean_mw) >= 1000 ? 'GW' : 'MW'} label="Mean" sparkline={spark} />
          </div>
        </div>
      )}
    </div>
  )
}
