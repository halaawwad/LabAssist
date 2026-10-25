import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { composableNoticeKinds, type NoticeKind } from '../../data/activity'
import { teams } from '../../data/teams'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Modal } from '../Modal'
import { noticeText } from '../noticeText'

type NoticeDialogProps = {
  audience?: string
  kind?: NoticeKind
  onClose: () => void
}

export function NoticeDialog({ audience: initialAudience = 'all', kind: initialKind = 'general', onClose }: NoticeDialogProps) {
  const i18n = useI18n()
  const { t } = i18n
  const { sendNotice, showToast } = useWorkshop()
  const [toAll, setToAll] = useState(initialAudience === 'all')
  const [teamId, setTeamId] = useState(initialAudience === 'all' ? '' : initialAudience)
  const [kind, setKind] = useState<NoticeKind>(initialKind)
  const [draft, setDraft] = useState<string | null>(null)

  // Until the manager edits it, the message follows the chosen notice type.
  const template = noticeText(
    { id: '', audience: '', kind, sentAt: '', params: kind === 'general' && !toAll && teamId ? { team: teamId } : {} },
    i18n,
  )
  const message = draft ?? template
  const valid = message.trim().length > 0 && (toAll || teamId !== '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    sendNotice(toAll ? 'all' : teamId, kind, message.trim())
    showToast(t('notices.sent', { audience: toAll ? t('notices.toAll') : teamId }))
    onClose()
  }

  return (
    <Modal
      title={t('notices.composeTitle')}
      icon={<Send size={19} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" form="notice-form" disabled={!valid}>
            <Send size={16} />
            {t('notices.send')}
          </button>
        </>
      }
    >
      <form id="notice-form" className="form-stack" onSubmit={submit}>
        <fieldset className="field">
          <legend className="field-label">{t('notices.audience')}</legend>
          <div className="segmented">
            <label className={toAll ? 'is-on' : ''}>
              <input type="radio" name="audience" checked={toAll} onChange={() => setToAll(true)} />
              {t('notices.allStudents')}
            </label>
            <label className={!toAll ? 'is-on' : ''}>
              <input type="radio" name="audience" checked={!toAll} onChange={() => setToAll(false)} />
              {t('notices.oneTeam')}
            </label>
          </div>
        </fieldset>

        {!toAll ? (
          <label className="field">
            <span className="field-label">{t('notices.team')}</span>
            <select className="input" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
              <option value="">{t('notices.chooseTeam')}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.id} · {team.project}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span className="field-label">{t('notices.type')}</span>
          <select className="input" value={kind} onChange={(event) => setKind(event.target.value as NoticeKind)}>
            {composableNoticeKinds.map((item) => (
              <option key={item} value={item}>
                {t(`notices.kinds.${item}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t('notices.message')}</span>
          <textarea
            className="input textarea"
            rows={3}
            maxLength={280}
            value={message}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      </form>
    </Modal>
  )
}
