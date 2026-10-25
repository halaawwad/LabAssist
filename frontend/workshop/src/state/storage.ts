// Small localStorage wrapper for the mock (backend-free) Workshop Manager state.
// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
const prefix = 'labassist.workshop.'

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(prefix + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(prefix + key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage blocked: the in-memory state still works for this session.
  }
}
