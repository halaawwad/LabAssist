type FilterChipsProps<T extends string> = {
  label: string
  options: { id: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}

export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div className="filter-chips" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={value === option.id ? 'is-on' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.count !== undefined ? <span>{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
