import { ArrowRight } from 'lucide-react'
import supportHardware from '../../assets/supervisor-support-portrait.png'
import { useI18n } from '../../i18n/i18nContext'

export function HardwareSupportCard() {
  const { t } = useI18n()

  return (
    <section className="support-card" aria-label={t('dashboard.support.aria')}>
      <img className="support-image" src={supportHardware} alt="" aria-hidden="true" />
      <div className="support-copy">
        <h2>
          {t('dashboard.support.titleLine1')}
          <br />
          {t('dashboard.support.titleLine2')}
        </h2>
        <p>{t('dashboard.support.body')}</p>
        <button className="support-arrow" type="button" aria-label={t('dashboard.support.open')}>
          <ArrowRight size={24} />
        </button>
      </div>
    </section>
  )
}
