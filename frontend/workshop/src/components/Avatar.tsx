const tints = ['olive', 'sand', 'sage', 'clay'] as const

export function initialsOf(name: string) {
  const words = name.replace(/^Dr\.\s*/, '').split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

/** Initials avatar; the tint is derived from the name so a person keeps the same color everywhere. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const tint = tints[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tints.length]
  return (
    <span className={`avatar avatar-${size} avatar-${tint}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}
