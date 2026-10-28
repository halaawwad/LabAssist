import { expect, it } from 'vitest'
import { en } from '../src/i18n/en'
import { ar } from '../src/i18n/ar'

function leaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (!value || typeof value !== 'object') return []
  if ('other' in value) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => leaves(child, `${prefix}.${key}`))
}
it('provides Arabic for every English translation key', () => {
  expect(leaves(ar).sort()).toEqual(leaves(en).sort())
})
