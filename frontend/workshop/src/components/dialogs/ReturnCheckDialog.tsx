import { useState, type FormEvent } from 'react'
import { PackageCheck } from 'lucide-react'
import type { ItemCondition } from '../../data/handover'
import { teamById } from '../../data/teams'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Modal } from '../Modal'

const conditions: ItemCondition[] = ['good', 'damaged', 'missing']

export function ReturnCheckDialog({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { t, formatDate } = useI18n()
  const { handover, checkReturn, showToast } = useWorkshop()
  const record = handover.find((item) => item.teamId === teamId)
  const [condition, setCondition] = useState<ItemCondition>(record?.condition ?? 'good')
  const [note, setNote] = useState(record?.note ?? '')

  if (!record) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    checkReturn(teamId, condition, note.trim())
    showToast(t('handover.checkedToast', { team: teamId }))
    onClose()
  }

  return (
    <Modal
      title={t('handover.checkTitle')}
      subtitle={`${teamId} · ${teamById.get(teamId)?.project ?? ''}`}
      icon={<PackageCheck size={20} />}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" form="return-form">
            <PackageCheck size={16} />
            {t('handover.confirm')}
          </button>
        </>
      }
    >
      <form id="return-form" className="form-stack" onSubmit={submit}>
        <div className="field">
          <span className="field-label">
            {t('handover.items')} · {t('handover.dateGiven', { date: formatDate(record.dateGiven) })}
          </span>
          <ul className="item-chips">
            {record.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <fieldset className="field">
          <legend className="field-label">{t('handover.condition')}</legend>
          <div className="segmented">
            {conditions.map((item) => (
              <label key={item} className={`${condition === item ? 'is-on' : ''} condition-${item}`}>
                <input type="radio" name="condition" checked={condition === item} onChange={() => setCondition(item)} />
                {t(`handover.conditions.${item}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="field-label">{t('handover.note')}</span>
          <input
            className="input"
            value={note}
            maxLength={120}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('handover.notePlaceholder')}
          />
        </label>
      </form>
    </Modal>
  )
}
