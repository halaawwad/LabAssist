import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
  it('hides portal content from a signed-out visitor', () => {
    expect(renderSession(false)).not.toContain('Private supervisor content')
  })
  it('renders portal content for the local signed-in session', () => {
    expect(renderSession(true)).toContain('Private supervisor content')
  })
})
