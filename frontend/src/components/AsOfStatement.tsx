interface AsOfStatementProps {
  asOf: string
  sentence: string
  publishedAt?: string
  cutoffUtc?: string
}

export function AsOfStatement({ asOf, sentence, publishedAt, cutoffUtc }: AsOfStatementProps) {
  return (
    <div className="as-of-statement">
      {asOf}
      {sentence && <br />}
      {sentence && <span className="font-serif text-ink text-[20px] font-normal">{sentence}</span>}
      {publishedAt || cutoffUtc ? (
        <p className="as-of-meta">
          {publishedAt ? `Forecast published ${publishedAt}` : ''}
          {cutoffUtc && publishedAt ? ' · ' : ''}
          {cutoffUtc ? `Cutoff ${cutoffUtc}` : ''}
        </p>
      ) : null}
    </div>
  )
}
