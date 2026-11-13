import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStored, writeStored, writeStoredOrThrow } from '../src/state/storage'

afterEach(() => vi.unstubAllGlobals())

describe('supervisor local storage resilience', () => {
  it('keeps student storage outside the supervisor namespace', () => {
    const values = new Map<string, string>([['labassist.student.profile', 'student']])
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } })
    writeStored('profile', { name: 'Doctor' })
    expect(readStored('profile', { name: '' })).toEqual({ name: 'Doctor' })
    expect(values.get('labassist.student.profile')).toBe('student')
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
  it('strict saves reject quota failures and leave existing records unchanged', () => {
    const values = new Map([['labassist.supervisor.profile', JSON.stringify({ name: 'Existing' })]])
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem() { throw new Error('quota') } } })
    expect(readStored('profile', { name: '' })).toEqual({ name: 'Existing' })
    expect(() => writeStoredOrThrow('profile', { name: 'Changed' })).toThrow('quota')
    expect(readStored('profile', { name: '' })).toEqual({ name: 'Existing' })
    expect(writeStored('profile', { name: 'Changed' })).toBe(false)
  })
  it('unreadable data cannot be overwritten with fallback records', () => {
    let raw = '{broken'
    vi.stubGlobal('window', { localStorage: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } } })
    expect(readStored('damaged', [])).toEqual([])
    expect(() => writeStoredOrThrow('damaged', [])).toThrow()
    expect(raw).toBe('{broken')
  })
  it('handles quota failure without crashing the current session', () => {
    vi.stubGlobal('window', { localStorage: { setItem() { throw new Error('quota') } } })
    expect(() => writeStored('profile', { name: 'Doctor' })).not.toThrow()
  })
})
