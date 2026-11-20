import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireSession } from '../src/layouts/supervisor/RequireSession'
import { AccountContext, type AccountContextValue } from '../src/state/supervisor/accountContext'
import { defaultSupervisorProfile } from '../src/data/supervisor/profileMockData'

function renderSession(isSignedIn: boolean) {
  const value: AccountContextValue = {
    profile: defaultSupervisorProfile, isSignedIn,
    updateProfile() {}, signIn() {}, signOut() {},
  }
  return renderToStaticMarkup(createElement(MemoryRouter, {},
    createElement(AccountContext.Provider, { value },
      createElement(RequireSession, { children: createElement('p', {}, 'Private supervisor content') })),
  ))
}
describe('mock session route boundary', () => {
  beforeEach(() => vi.stubEnv('VITE_AUTH_MODE', 'demo'))
  afterEach(() => vi.unstubAllEnvs())
  it('hides portal content from a signed-out visitor', () => {
    expect(renderSession(false)).not.toContain('Private supervisor content')
  })
  it('renders portal content for the local signed-in session', () => {
    expect(renderSession(true)).toContain('Private supervisor content')
  })
})

describe('API session route boundary', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('does not trust a locally signed-in mock account before server validation', () => {
    vi.stubEnv('VITE_AUTH_MODE', 'api')
    expect(renderSession(true)).not.toContain('Private supervisor content')
    expect(renderSession(true)).toContain('Checking your session')
  })
})
