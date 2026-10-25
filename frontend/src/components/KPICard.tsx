
interface KPICardProps {
  value: string | number
  label: string
  unit?: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KPICard({ value, label, unit, change, trend }: KPICardProps) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {change && (
        <div className={`mt-2 text-xs font-mono ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-context-light'}`}>
          {change}
        </div>
      )}
    </div>
  )
}
