interface CutoffRuleProps {
  label?: string
  height?: string | number
}

export function CutoffRule({ label = '09:00 cutoff · D-1', height = '100%' }: CutoffRuleProps) {
  return (
    <div className="relative">
      <div className="cutoff-rule" style={{ height }} />
      {label && (
        <div className="absolute -left-8 top-0 w-[80px]">
          <span className="font-mono text-ink-muted text-[10px] leading-none rotate-[-90deg] -translate-y-full">
            {label}
          </span>
        </div>
      )}
    </div>
  )
}
