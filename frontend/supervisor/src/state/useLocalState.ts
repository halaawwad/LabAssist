import { useEffect, useState } from 'react'
import { readStored, writeStored } from './storage'

/** Local mock records survive route changes and reloads; storage failures keep session state usable. */
export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback))
  useEffect(() => {
    writeStored(key, value)
  }, [key, value])
  return [value, setValue] as const
}
