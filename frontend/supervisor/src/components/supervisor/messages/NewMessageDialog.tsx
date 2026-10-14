import { MessageSquarePlus } from 'lucide-react'
import { progressProjects } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { ActionDialog } from '../tasks/ActionDialog'

export type NewMessage = {
  studentName: string
  projectCode: string
  text: string
}

type NewMessageDialogProps = {
  onClose: () => void
  onSend: (message: NewMessage) => void
}

/** Starts (or continues) a direct chat with one of the supervised students. */
export function NewMessageDialog({ onClose, onSend }: NewMessageDialogProps) {
  const { t } = useI18n()

  const submit = (data: FormData) => {
    const [projectCode, studentName] = String(data.get('student') ?? '').split('|')
    const text = String(data.get('text') ?? '').trim()
    if (!projectCode || !studentName || !text) return
    onSend({ studentName, projectCode, text })
    onClose()
  }

  return (
    <ActionDialog
      title={t('messages.newDialog.title')}
      description={t('messages.newDialog.description')}
      icon={MessageSquarePlus}
      submitLabel={t('messages.newDialog.submit')}
      onSubmit={submit}
      onClose={onClose}
    >
      <label className="dialog-field">
        <span>{t('messages.newDialog.student')}</span>
        <select name="student" required defaultValue="">
          <option value="" disabled>
            {t('messages.newDialog.selectStudent')}
          </option>
          {progressProjects.map((project) => (
            <optgroup label={`${project.code} · ${project.name}`} key={project.code}>
              {project.students.map((student) => (
                <option value={`${project.code}|${student.name}`} key={student.universityId}>
                  {student.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="dialog-field">
        <span>{t('messages.newDialog.message')}</span>
        <textarea name="text" required rows={4} maxLength={1000} placeholder={t('messages.newDialog.messagePlaceholder')} />
      </label>
    </ActionDialog>
  )
}
