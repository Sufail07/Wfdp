interface SparklineProps {
  data: number[]
  color?: string
  height?: string | number
  className?: string
}

export function Sparkline({ data, color = 'var(--accent)', height = 20, className }: SparklineProps) {
  if (!data || data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x}%,${y}%`
    })
    .join(' ')

  return (
    <svg
      className={`sparkline block w-full ${className || ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ height }}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
