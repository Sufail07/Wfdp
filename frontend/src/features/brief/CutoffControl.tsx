import React from 'react'

interface CutoffControlProps {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}

export function CutoffControl({ hour, minute, onChange }: CutoffControlProps) {
  return (
    <div className="card">
      <label className="label">Cutoff Time (London)</label>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Hour</label>
          <input
            type="number"
            value={hour}
            min={0}
            max={23}
            onChange={(e) => onChange(parseInt(e.target.value) || 0, minute)}
            className="w-16 input"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Minute</label>
          <input
            type="number"
            value={minute}
            min={0}
            max={59}
            onChange={(e) => onChange(hour, parseInt(e.target.value) || 0)}
            className="w-16 input"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Default: 09:00 Europe/London
        </p>
      </div>
    </div>
  )
}