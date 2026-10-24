import React from 'react'
import { useTheme } from '../../context/ThemeContext'

interface DeliveryDayPickerProps {
  value: string
  onChange: (date: string) => void
  min?: string
  max?: string
}

export function DeliveryDayPicker({ value, onChange, min, max }: DeliveryDayPickerProps) {
  const { theme } = useTheme()

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
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Select the delivery day D. Cutoff defaults to D-1 09:00 London.
      </p>
    </div>
  )
}