import React, { useState, useMemo } from 'react'
import { useDecisionForecast, useForecastRevisions, useRiskBand } from '../../api/client'
import { DeliveryDayPicker } from './DeliveryDayPicker'
import { CutoffControl } from './CutoffControl'
import { KPIStrip } from './KPIStrip'
import { MainChart } from './MainChart'
import { VintagesToggle } from './VintagesToggle'
import { AsOfCallout } from './AsOfCallout'
import { formatMW, formatMWh, formatLondonTime } from '../../utils/format'
import { ErrorState } from '../../components/ErrorState'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const DEFAULT_DATE = '2026-01-02'

export function DecisionBrief() {
  const [deliveryDate, setDeliveryDate] = useState(DEFAULT_DATE)
  const [cutoffHour, setCutoffHour] = useState(9)
  const [cutoffMinute, setCutoffMinute] = useState(0)
  const [showVintages, setShowVintages] = useState(false)

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
    data: revisions,
    isLoading: revisionsLoading,
  } = useForecastRevisions(deliveryDate, showVintages ? 20 : 5)

  const {
    data: riskBand,
    isLoading: riskLoading,
  } = useRiskBand({
    delivery_date: deliveryDate,
    cutoff_hour: cutoffHour,
    cutoff_minute: cutoffMinute,
  })

  // Compute risk-adjusted series
  const riskAdjustedSeries = useMemo(() => {
    if (!riskBand?.risk_adjusted) return []
    return riskBand.risk_adjusted.map((p) => ({
      x: p.startTime,
      y: p.riskAdjustedMW,
    }))
  }, [riskBand])

  // Compute decision forecast series
  const forecastSeries = useMemo(() => {
    if (!forecast?.forecasts) return []
    return forecast.forecasts.map((f) => ({
      x: f.startTime,
      y: f.forecastMW,
    }))
  }, [forecast])

  const latestForecastMW = forecastSeries.length > 0
    ? forecastSeries[forecastSeries.length - 1].y
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:w-1/3 space-y-4">
          <DeliveryDayPicker
            value={deliveryDate}
            onChange={setDeliveryDate}
            min="2026-01-02"
            max="2026-02-01"
          />
          <CutoffControl
            hour={cutoffHour}
            minute={cutoffMinute}
            onChange={setCutoffHour}
          />
          <VintagesToggle
            enabled={showVintages}
            onToggle={setShowVintages}
            vintageCount={revisions?.vintages?.length || 0}
          />
        </div>

        <div className="lg:w-2/3 space-y-6">
          {(forecastLoading || revisionsLoading || riskLoading) && (
            <div className="h-[500px]">
              <LoadingSkeleton className="h-48 w-full" />
              <LoadingSkeleton className="h-32 w-3/4 mt-4" />
            </div>
          )}

          {forecastError && <ErrorState message={forecastError.message} />}

          {!forecastLoading && forecast && !forecastError && (
            <>
              <KPIStrip
                totalExpectedMWh={forecast.total_expected_mwh}
                peakMW={forecast.peak_mw}
                minMW={forecast.min_mw}
                meanMW={forecast.mean_mw}
                publishedAt={forecast.forecast_published_at
                  ? formatLondonTime(forecast.forecast_published_at, 'HH:mm')
                  : undefined}
                freshness={forecast.cutoff_utc ? formatLondonTime(forecast.cutoff_utc, 'HH:mm') : undefined}
              />

              <MainChart
                decisionForecast={forecastSeries}
                riskAdjusted={riskAdjustedSeries}
                title={`Wind Forecast for ${deliveryDate}`}
              />

              {forecast.forecasts && forecast.forecasts.length > 0 && (
                <AsOfCallout
                  deliveryDate={deliveryDate}
                  cutoffHour={cutoffHour}
                  cutoffMinute={cutoffMinute}
                  publishedAt={forecast.forecast_published_at || '--'}
                  forecastMW={latestForecastMW || 0}
                  laterMW={revisions?.vintages?.[revisions.vintages.length - 1]?.forecastMW}
                  moveMW={
                    latestForecastMW !== undefined && revisions?.vintages?.[revisions.vintages.length - 1]?.forecastMW !== undefined
                      ? revisions.vintages[revisions.vintages.length - 1].forecastMW - latestForecastMW
                      : undefined
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}