import { useCallback, useRef, useState, type SetStateAction } from 'react'
import { readStored, writeStoredOrThrow } from './storage'

/** Persist before committing visible state, so failed saves cannot announce success. */
export function useLocalState<T>(key: string, fallback: T) {
  const [value, update] = useState<T>(() => readStored(key, fallback))
  const current = useRef(value)
  const setValue = useCallback((action: SetStateAction<T>) => {
    const next = typeof action === 'function' ? (action as (value: T) => T)(current.current) : action
    writeStoredOrThrow(key, next)
    current.current = next
    update(next)
  }, [key])
  return [value, setValue] as const
}
