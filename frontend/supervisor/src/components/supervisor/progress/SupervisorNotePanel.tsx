import { useI18n } from '../../../i18n/i18nContext'

type SupervisorNotePanelProps = {
  note: string
}

export function SupervisorNotePanel({ note }: SupervisorNotePanelProps) {
  const { t } = useI18n()

  return (
    <section className="progress-side-panel progress-note-panel glass-panel" aria-labelledby="supervisor-note-title">
      <h2 id="supervisor-note-title">{t('progress.note')}</h2>
      <p>{note}</p>
      <button className="progress-note-edit" type="button">
        {t('common.edit')}
      </button>
    </section>
  )
}
