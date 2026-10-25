import { useState, useMemo } from 'react'
import { useDecisionForecast, useForecastRevisions, useRiskBand } from '../../api/client'
import { DeliveryDayPicker } from './DeliveryDayPicker'
import { CutoffControl } from './CutoffControl'
import { KPIStrip } from './KPIStrip'
import { MainChart } from './MainChart'
import { VintagesToggle } from './VintagesToggle'
import { AsOfCallout } from './AsOfCallout'
import { formatLondonTime } from '../../utils/format'
import { ErrorState } from '../../components/ErrorState'
import { LoadingSkeleton } from '../../components/LoadingSkeleton'

const DEFAULT_DATE = '2026-01-02'

export function DecisionBrief() {
  const [deliveryDate, setDeliveryDate] = useState(DEFAULT_DATE)
  const [cutoffHour, setCutoffHour] = useState(9)
  const [showVintages, setShowVintages] = useState(false)

  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
  } = useDecisionForecast({
    delivery_date: deliveryDate,
    cutoff_hour: cutoffHour,
    cutoff_minute: 0,
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
    cutoff_minute: 0,
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

  const latestForecastMW = forecastSeries.length > 0
    ? forecastSeries[forecastSeries.length - 1].y
    : undefined

  const lastVintageMW = revisions?.vintages?.[revisions.vintages.length - 1]?.forecastMW

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
            minute={0}
            onChange={(h) => setCutoffHour(h)}
          />
          <VintagesToggle
            enabled={showVintages}
            onToggle={() => setShowVintages((prev) => !prev)}
            vintageCount={revisions?.vintages?.length ?? 0}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-moment text-display tracking-tight">
                    Wind Forecast &mdash; {deliveryDate}
                  </h1>
                  <p className="font-mono text-context mt-1 text-data">
                    Cutoff {cutoffHour.toString().padStart(2, '0')}:00 London &middot; Published {forecast.forecast_published_at ? formatLondonTime(forecast.forecast_published_at, 'HH:mm') : '--'}
                  </p>
                </div>
              </div>

              <KPIStrip
                totalExpectedMWh={forecast.total_expected_mwh ?? 0}
                peakMW={forecast.peak_mw ?? 0}
                minMW={forecast.min_mw ?? 0}
                meanMW={forecast.mean_mw ?? 0}
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

              {forecast.forecasts && forecast.forecasts.length > 0 && latestForecastMW !== undefined && lastVintageMW !== undefined && (
                <AsOfCallout
                  deliveryDate={deliveryDate}
                  cutoffHour={cutoffHour}
                  cutoffMinute={0}
                  publishedAt={forecast.forecast_published_at || '--'}
                  forecastMW={latestForecastMW}
                  laterMW={lastVintageMW}
                  moveMW={lastVintageMW - latestForecastMW}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
