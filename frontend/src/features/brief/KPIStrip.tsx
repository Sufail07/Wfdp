import { KPICard } from '../../components/KPICard'

interface KPIStripProps {
  totalExpectedMWh?: number
  peakMW?: number
  minMW?: number
  meanMW?: number
  publishedAt?: string
  freshness?: string
}

export function KPIStrip({
  totalExpectedMWh,
  peakMW,
  minMW,
  meanMW,
  publishedAt,
  freshness,
}: KPIStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      <KPICard value={totalExpectedMWh !== undefined ? totalExpectedMWh.toFixed(1) : '--'} label="Expected Wind" unit="MWh" />
      <KPICard value={peakMW !== undefined ? peakMW.toFixed(0) : '--'} label="Peak Forecast" unit="MW" />
      <KPICard value={minMW !== undefined ? minMW.toFixed(0) : '--'} label="Min Forecast" unit="MW" />
      <KPICard value={meanMW !== undefined ? meanMW.toFixed(0) : '--'} label="Mean Forecast" unit="MW" />
      <KPICard value={publishedAt || '--'} label="Forecast Published At" />
      <KPICard value={freshness || '--'} label="Data Freshness" />
    </div>
  )
}