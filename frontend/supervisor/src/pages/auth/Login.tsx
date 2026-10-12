import type { FormEvent } from 'react'
import { Box, CircleCheck, Languages, LogIn } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import workshopPoster from '../../assets/supervisor-students-hero.png'
import { useI18n } from '../../i18n/i18nContext'
import { useAccount } from '../../state/supervisor/accountContext'

/**
 * Sign-in entry of the Supervisor portal. There is no backend yet: any email and password
 * start the mock session. Replace `signIn` with the real auth call when the API exists.
 */
// Local workshop clip, served from `public/videos/`. Until it exists, the poster photo is shown.
const workshopVideo = `${import.meta.env.BASE_URL}videos/supervisor-login-workshop.mp4`

export function Login() {
  const { t, language, setLanguage } = useI18n()
  const { profile, isSignedIn, signIn } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const signedOut = (location.state as { signedOut?: boolean } | null)?.signedOut === true

  if (isSignedIn) return <Navigate to="/supervisor/dashboard" replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    signIn()
    navigate('/supervisor/dashboard', { replace: true })
  }

  return (
    <div className="supervisor-shell auth-shell">
      <main className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel-top">
          <div className="brand-mark">
            <div className="brand-icon" aria-hidden="true">
              <Box size={32} strokeWidth={1.8} />
            </div>
            <div>
              <strong>{t('app.brand')}</strong>
              <span>{t('app.portal')}</span>
            </div>
          </div>
          <button
            className="text-button auth-language"
            type="button"
            lang={language === 'ar' ? 'en' : 'ar'}
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            <Languages size={17} aria-hidden="true" />
            {t('login.switchLanguage')}
          </button>
        </div>

        <div className="auth-body">
          <header className="auth-heading">
            <h1 id="login-title">{t('login.title')}</h1>
            <p>{t('login.subtitle')}</p>
          </header>

          {signedOut ? (
            <p className="auth-notice" role="status">
              <CircleCheck size={18} aria-hidden="true" />
              {t('login.signedOut')}
            </p>
          ) : null}

          <form className="auth-form" onSubmit={submit}>
            <label className="dialog-field">
              <span>{t('login.email')}</span>
              <input name="email" type="email" required dir="ltr" autoComplete="username" defaultValue={profile.email} />
            </label>
            <label className="dialog-field">
              <span>{t('login.password')}</span>
              <input name="password" type="password" required dir="ltr" autoComplete="current-password" />
            </label>
            <button className="dialog-primary-button auth-submit" type="submit">
              <LogIn size={18} aria-hidden="true" />
              {t('login.submit')}
            </button>
          </form>
        </div>
      </main>

      <div className="auth-visual" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto" poster={workshopPoster} disablePictureInPicture>
          <source src={workshopVideo} type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
