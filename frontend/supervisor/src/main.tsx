import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18nProvider'
import { AccountProvider } from './state/supervisor/AccountProvider'
import { NotificationsProvider } from './state/supervisor/NotificationsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AccountProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AccountProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
