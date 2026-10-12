import { useEffect, useState } from 'react'

/** Short-lived confirmation message, shown with the same toast as the Tasks page. */
export function useNotice(durationMs = 4000) {
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, notice])

  return [notice, setNotice] as const
}
