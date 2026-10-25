import { Sparkline } from './Sparkline'

interface KpiNumeralProps {
  value: string | number
  label: string
  unit?: string
  n?: number
  nDays?: number
  sparkline?: number[]
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  helpText?: string
}

export function KpiNumeral({
  value,
  label,
  unit,
  n,
  nDays,
  sparkline,
  change,
  trend,
  helpText,
}: KpiNumeralProps) {
  const trendColor = trend === 'up' ? 'text-over' : trend === 'down' ? 'text-under' : 'text-ink-muted'
  const nText = n !== undefined && nDays !== undefined ? `${n} half-hours · ${nDays} days` : n !== undefined ? `${n} samples` : ''

  return (
    <div className="kpi-numeral">
      <div className="flex items-baseline gap-1">
        <span className="kpi-number">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      <span className="kpi-label">{label}</span>
      {nText && (
        <p className="text-xs font-mono text-ink-muted mt-0.5">{nText}</p>
      )}
      {helpText && (
        <p className="text-xs font-mono text-ink-muted mt-0.5">{helpText}</p>
      )}
      {change && (
        <div className={`mt-1 font-mono text-xs font-medium ${trendColor}`}>{change}</div>
      )}
      {sparkline && <Sparkline data={sparkline} className="mt-3" />}
    </div>
  )
}
