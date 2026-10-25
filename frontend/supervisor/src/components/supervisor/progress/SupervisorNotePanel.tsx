import { useI18n } from '../../../i18n/i18nContext'
import { useState } from 'react'
import { PencilLine } from 'lucide-react'
import { ActionDialog } from '../tasks/ActionDialog'
import { interactionLabels } from '../interactionLabels'
import { useLocalState } from '../../../state/useLocalState'

type SupervisorNotePanelProps = {
  note: string
  projectCode: string
}

export function SupervisorNotePanel({ note, projectCode }: SupervisorNotePanelProps) {
  const { t, language } = useI18n()
  const [notes, setNotes] = useLocalState<Record<string, string>>('progress-notes.v1', {})
  const [editing, setEditing] = useState(false)

  return (
    <section
      className="progress-side-panel progress-note-panel glass-panel"
      aria-labelledby="supervisor-note-title"
    >
      <h2 id="supervisor-note-title">{t('progress.note')}</h2>
      <p>{notes[projectCode] ?? note}</p>
      <button className="progress-note-edit" type="button" onClick={() => setEditing(true)}>
        {t('common.edit')}
      </button>
      {editing && (
        <ActionDialog
          title={interactionLabels[language].note}
          description={interactionLabels[language].local}
          icon={PencilLine}
          onClose={() => setEditing(false)}
          submitLabel={t('common.save')}
          onSubmit={(data) => {
            setNotes((items) => ({ ...items, [projectCode]: String(data.get('note')).trim() }))
            setEditing(false)
          }}
        >
          <label className="dialog-field">
            <span>{t('progress.note')}</span>
            <textarea
              name="note"
              required
              maxLength={2000}
              defaultValue={notes[projectCode] ?? note}
            />
          </label>
        </ActionDialog>
      )}
    </section>
  )
}
