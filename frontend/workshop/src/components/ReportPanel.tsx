import { ChevronRight, CircleAlert, FileText, PenLine, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { Panel } from './Panel'

export function ReportPanel() {
  const { t } = useI18n()
  const { openDialog } = useDialogs()

  return (
    <Panel
      icon={FileText}
      title={t('report.title')}
      titleId="dash-report"
      action={
        <Link className="icon-link" to="/supervisor-notes" aria-label={t('nav.supervisorNotes')}>
          <ChevronRight size={20} className="flip-rtl" />
        </Link>
      }
    >
      <div className="action-grid report-actions">
        <button
          className="btn btn-ghost btn-quiet btn-sm"
          type="button"
          onClick={() => openDialog({ type: 'report', observationType: 'repeatedAbsence' })}
        >
          <Users size={17} />
          {t('report.types.repeatedAbsence')}
        </button>
        <button
          className="btn btn-ghost btn-quiet btn-sm"
          type="button"
          onClick={() => openDialog({ type: 'report', observationType: 'readyMade' })}
        >
          <CircleAlert size={17} />
          {t('report.types.readyMade')}
        </button>
        <button className="btn btn-ghost btn-quiet btn-sm span-2" type="button" onClick={() => openDialog({ type: 'report' })}>
          <PenLine size={17} />
          {t('report.addNote')}
        </button>
      </div>
    </Panel>
  )
}
