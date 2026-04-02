interface NumberPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

export function NumberPad({ value, onChange, maxLength = 10 }: NumberPadProps) {
  const handleDigit = (digit: string) => {
    if (digit === '.' && value.includes('.')) return
    if (digit === '.' && value === '') return
    if ((value === '0' || value === '') && digit !== '.') {
      onChange(digit)
      return
    }
    if (value.length >= maxLength) return
    onChange(value + digit)
  }

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('')
    } else {
      onChange(value.slice(0, -1))
    }
  }

  const handleClear = () => onChange('')

  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', '⌫'],
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Display */}
      <div className="bg-slate-700 rounded-xl px-4 py-3 text-right text-2xl font-mono text-white min-h-[56px] flex items-center justify-end border border-slate-600">
        {value !== '' ? value : <span className="text-slate-500 text-lg">0</span>}
      </div>

      {/* Key grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.flat().map((key) => {
          const isBackspace = key === '⌫'
          return (
            <button
              key={key}
              type="button"
              onClick={isBackspace ? handleBackspace : () => handleDigit(key)}
              className={`rounded-xl text-xl font-semibold py-4 transition-colors active:scale-95 min-h-[56px]
                ${isBackspace
                  ? 'bg-slate-600 text-red-300 hover:bg-slate-500'
                  : key === '.'
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
            >
              {key}
            </button>
          )
        })}
      </div>

      {/* Clear button */}
      <button
        type="button"
        onClick={handleClear}
        className="w-full rounded-xl py-3 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors min-h-[44px]"
      >
        Clear
      </button>
    </div>
  )
}
