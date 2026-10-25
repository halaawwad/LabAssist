import { useState, type FormEvent } from 'react'
import { FileText, Info, Send } from 'lucide-react'
import { observationTypes, type ObservationType } from '../../data/activity'
import { supervisorFor, teams } from '../../data/teams'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Avatar } from '../Avatar'
import { Modal } from '../Modal'

type ReportDialogProps = {
  teamId?: string
  observationType?: ObservationType
  onClose: () => void
}

/** Workshop observation for the supervisor of a project; the supervisor is derived from the team. */
export function ReportDialog({ teamId: initialTeam = '', observationType = 'general', onClose }: ReportDialogProps) {
  const { t } = useI18n()
  const { sendObservation, showToast } = useWorkshop()
  const [teamId, setTeamId] = useState(initialTeam)
  const [type, setType] = useState<ObservationType>(observationType)
  const [note, setNote] = useState('')
  const supervisor = teamId ? supervisorFor(teamId) : undefined
  const valid = Boolean(supervisor) && note.trim().length > 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    const sent = sendObservation(teamId, type, note.trim())
    if (sent && supervisor) showToast(t('report.sent', { supervisor: supervisor.name }))
    onClose()
  }

  return (
    <Modal
      title={t('report.dialogTitle')}
      icon={<FileText size={20} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" form="report-form" disabled={!valid}>
            <Send size={16} />
            {t('report.send')}
          </button>
        </>
      }
    >
      <form id="report-form" className="form-stack" onSubmit={submit}>
        <p className="inline-hint">
          <Info size={16} aria-hidden="true" />
          {t('report.disclaimer')}
        </p>

        <label className="field">
          <span className="field-label">{t('report.project')}</span>
          <select className="input" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
            <option value="">{t('report.chooseTeam')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.id} · {team.project}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">{t('report.supervisor')}</span>
          <div className={`supervisor-chip ${supervisor ? '' : 'is-empty'}`} aria-live="polite">
            {supervisor ? <Avatar name={supervisor.name} size="sm" /> : null}
            <span>{supervisor?.name ?? t('report.supervisorHint')}</span>
          </div>
        </div>

        <fieldset className="field">
          <legend className="field-label">{t('report.type')}</legend>
          <div className="choice-pills">
            {observationTypes.map((item) => (
              <label key={item} className={`${type === item ? 'is-on' : ''} ${item === 'positive' ? 'is-positive' : ''}`}>
                <input type="radio" name="observation-type" checked={type === item} onChange={() => setType(item)} />
                {t(`report.types.${item}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="field-label">{t('report.note')}</span>
          <textarea
            className="input textarea"
            rows={3}
            maxLength={280}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('report.notePlaceholder')}
            required
          />
        </label>
      </form>
    </Modal>
  )
}
