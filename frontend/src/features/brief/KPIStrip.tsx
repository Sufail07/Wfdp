import { KPICard } from '../../components/KPICard'

interface KPIStripProps {
  totalExpectedMWh?: number
  peakMW?: number
  minMW?: number
  meanMW?: number
}

export function KPIStrip({
  totalExpectedMWh,
  peakMW,
  minMW,
  meanMW,
}: KPIStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard value={totalExpectedMWh !== undefined ? totalExpectedMWh.toFixed(1) : '--'} label="Expected Wind" unit="MWh" />
      <KPICard value={peakMW !== undefined ? peakMW.toFixed(0) : '--'} label="Peak Forecast" unit="MW" />
      <KPICard value={minMW !== undefined ? minMW.toFixed(0) : '--'} label="Min Forecast" unit="MW" />
      <KPICard value={meanMW !== undefined ? meanMW.toFixed(0) : '--'} label="Mean Forecast" unit="MW" />
    </div>
  )
}
