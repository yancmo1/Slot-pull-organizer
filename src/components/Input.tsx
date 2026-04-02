import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', type, ...props }: InputProps) {
  // Use inputMode="decimal" for numeric inputs to show number keyboard on mobile
  const inputMode = type === 'number' ? 'decimal' : undefined

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        className={`bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} text-white rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
