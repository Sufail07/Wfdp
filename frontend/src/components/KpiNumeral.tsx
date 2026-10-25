import { Sparkline } from './Sparkline'

interface KpiNumeralProps {
  value: string | number
  label: string
  unit?: string
  sparkline?: number[]
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiNumeral({ value, label, unit, sparkline, change, trend }: KpiNumeralProps) {
  const trendColor = trend === 'up' ? 'text-over' : trend === 'down' ? 'text-under' : 'text-ink-muted'

  return (
    <div className="kpi-numeral">
      <div className="flex items-baseline gap-1">
        <span className="kpi-number">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      <span className="kpi-label">{label}</span>
      {change && (
        <div className={`mt-1 font-mono text-xs font-medium ${trendColor}`}>{change}</div>
      )}
      {sparkline && <Sparkline data={sparkline} className="mt-3" />}
    </div>
  )
}
