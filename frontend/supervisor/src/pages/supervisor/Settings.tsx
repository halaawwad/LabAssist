import type { ReactNode } from 'react'
import { Bell, Languages, type LucideIcon } from 'lucide-react'
import { Notice } from '../../components/supervisor/account/Notice'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { notificationTypes } from '../../data/supervisor/notificationsMockData'
import { ar } from '../../i18n/ar'
import { en } from '../../i18n/en'
import { useI18n, type Language, type TranslationKey } from '../../i18n/i18nContext'
import { useNotifications } from '../../state/supervisor/notificationsContext'

const languageOptions: { value: Language; label: TranslationKey; direction: TranslationKey }[] = [
  { value: 'en', label: 'settings.language.english', direction: 'settings.language.ltr' },
  { value: 'ar', label: 'settings.language.arabic', direction: 'settings.language.rtl' },
]

export function Settings() {
  const { t } = useI18n()
  const [notice, setNotice] = useNotice()

  return (
    <>
      <SupervisorTopBar />

      <section className="account-page settings-page" aria-labelledby="settings-title">
        <header className="account-heading">
          <div>
            <h1 id="settings-title">{t('settings.title')}</h1>
            <p>{t('settings.subtitle')}</p>
          </div>
        </header>

        <div className="settings-layout">
          <LanguageSettings onNotice={setNotice} />
          <NotificationSettings />
        </div>
      </section>

      <Notice message={notice} />
    </>
  )
}

type SettingsSectionProps = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

function SettingsSection({ id, icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section" aria-labelledby={id}>
      <header className="settings-section-header">
        <span className="action-dialog-icon" aria-hidden="true">
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

function LanguageSettings({ onNotice }: { onNotice: (message: string) => void }) {
  const { t, language, setLanguage } = useI18n()

  return (
    <SettingsSection
      id="language-settings-title"
      icon={Languages}
      title={t('settings.language.title')}
      description={t('settings.language.description')}
    >
      <div className="settings-choices" role="radiogroup" aria-labelledby="language-settings-title">
        {languageOptions.map((option) => (
          <label className="settings-choice" key={option.value}>
            <input
              type="radio"
              name="language"
              value={option.value}
              checked={language === option.value}
              onChange={() => {
                setLanguage(option.value)
                // Confirm in the newly selected language.
                onNotice((option.value === 'ar' ? ar : en).settings.language.changed)
              }}
            />
            <span>
              {/* Each language name is written in that language. */}
              <strong lang={option.value}>{t(option.label)}</strong>
              <small>{t(option.direction)}</small>
            </span>
          </label>
        ))}
      </div>
    </SettingsSection>
  )
}

function NotificationSettings() {
  const { t } = useI18n()
  const { preferences, setTypeEnabled, setEmailSummary } = useNotifications()

  return (
    <SettingsSection
      id="notification-preferences-title"
      icon={Bell}
      title={t('settings.notifications.title')}
      description={t('settings.notifications.description')}
    >
      <ul className="settings-toggle-list">
        {notificationTypes.map((type) => (
          <SettingsToggle
            label={t(`notifications.types.${type}`)}
            description={t(`settings.notifications.types.${type}`)}
            checked={preferences.types[type]}
            onChange={(checked) => setTypeEnabled(type, checked)}
            key={type}
          />
        ))}
        <SettingsToggle
          label={t('settings.notifications.email')}
          description={t('settings.notifications.emailDescription')}
          checked={preferences.emailSummary}
          onChange={setEmailSummary}
        />
      </ul>
    </SettingsSection>
  )
}

type SettingsToggleProps = {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingsToggle({ label, description, checked, onChange }: SettingsToggleProps) {
  return (
    <li>
      <label className="settings-toggle">
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        <input
          className="settings-switch"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </li>
  )
}
