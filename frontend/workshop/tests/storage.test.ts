import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStored, writeStored } from '../src/state/storage'

afterEach(() => vi.unstubAllGlobals())

describe('workshop local storage resilience', () => {
  it('keeps student storage outside the workshop namespace', () => {
    const values = new Map<string, string>([['labassist.supervisor.profile', 'student']])
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } })
    writeStored('profile', { name: 'Doctor' })
    expect(readStored('profile', { name: '' })).toEqual({ name: 'Doctor' })
    expect(values.get('labassist.supervisor.profile')).toBe('student')
  })
  it('returns defaults when storage is blocked', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked') } })
    expect(readStored('profile', { name: 'Fallback' })).toEqual({ name: 'Fallback' })
    expect(() => writeStored('profile', {})).not.toThrow()
  })
  it('recovers from malformed stored JSON', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => '{broken' } })
    expect(readStored('profile', null)).toBeNull()
  })
  it('handles quota failure without crashing the current session', () => {
    vi.stubGlobal('window', { localStorage: { setItem() { throw new Error('quota') } } })
    expect(() => writeStored('profile', { name: 'Doctor' })).not.toThrow()
  })
})
