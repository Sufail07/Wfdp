interface DeliveryDayPickerProps {
  value: string
  onChange: (date: string) => void
  min?: string
  max?: string
}

export function DeliveryDayPicker({ value, onChange, min, max }: DeliveryDayPickerProps) {

  return (
    <div className="card">
      <label className="label">Delivery Date</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="input"
      />
      <p className="text-caption text-context mt-1">
        Select the delivery day D. Cutoff defaults to D-1 09:00 London.
      </p>
    </div>
  )
}
