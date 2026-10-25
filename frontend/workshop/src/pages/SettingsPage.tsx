import { Clock, Languages, RotateCcw } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { workingHours } from '../data/activity'
import { useI18n, type Language } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

const languages: Language[] = ['en', 'ar']

export function SettingsPage() {
  const { t, language, setLanguage, formatTime } = useI18n()
  const { resetDemo, showToast } = useWorkshop()

  return (
    <div className="page">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <section className="panel settings-panel" aria-label={t('settings.title')}>
        <div className="setting-row">
          <Languages size={22} aria-hidden="true" />
          <div>
            <strong id="setting-language">{t('settings.language')}</strong>
            <span>{t('settings.languageHint')}</span>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="setting-language">
            {languages.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={language === item}
                className={language === item ? 'is-on' : ''}
                onClick={() => setLanguage(item)}
                lang={item}
              >
                {t(item === 'en' ? 'settings.english' : 'settings.arabic')}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <Clock size={22} aria-hidden="true" />
          <div>
            <strong>{t('settings.workingHours')}</strong>
            <span>{t('settings.workingHoursHint')}</span>
          </div>
          <span className="setting-value">
            {formatTime(workingHours.start)} – {formatTime(workingHours.end)}
          </span>
        </div>

        <div className="setting-row">
          <RotateCcw size={22} aria-hidden="true" />
          <div>
            <strong>{t('settings.reset')}</strong>
            <span>{t('settings.resetHint')}</span>
          </div>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              resetDemo()
              showToast(t('settings.resetToast'))
            }}
          >
            {t('settings.reset')}
          </button>
        </div>
        <p className="demo-note">{t('common.demo')}</p>
      </section>
    </div>
  )
}
