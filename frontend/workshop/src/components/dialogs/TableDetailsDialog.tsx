import { Circle, FileText, RectangleVertical } from 'lucide-react'
import { studentsOf, supervisorFor, teamById } from '../../data/teams'
import { capacityOf, tableStatus, workshopTables } from '../../data/workshopTables'
import { useI18n } from '../../i18n/i18nContext'
import { useDialogs } from '../../state/dialogContext'
import { useWorkshop } from '../../state/workshopContext'
import { Modal } from '../Modal'
import { StatusDot } from '../StatusDot'

export function TableDetailsDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const { t } = useI18n()
  const { attendance } = useWorkshop()
  const { openDialog } = useDialogs()
  const table = workshopTables.find((item) => item.code === code)
  if (!table) return null

  const status = tableStatus(table)
  const capacity = capacityOf(table.shape)

  return (
    <Modal
      title={t('table.title', { code })}
      icon={table.shape === 'rect' ? <RectangleVertical size={20} /> : <Circle size={20} />}
      onClose={onClose}
      footer={
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <dl className="fact-grid">
        <div>
          <dt>{t('table.shape')}</dt>
          <dd>{t(table.shape === 'rect' ? 'table.rect' : 'table.round')}</dd>
        </div>
        <div>
          <dt>{t('table.capacity')}</dt>
          <dd>{t(capacity === 1 ? 'table.capacityOne' : 'table.capacityTwo')}</dd>
        </div>
        <div>
          <dt>{t('common.status')}</dt>
          <dd className="status-line">
            <StatusDot status={status} />
            {t(`map.status.${status}`)}
          </dd>
        </div>
      </dl>

      <h3 className="section-label">{t('table.teams')}</h3>
      {table.teamIds.length === 0 ? <p className="empty-note">{t('table.free')}</p> : null}
      <div className="team-cards">
        {table.teamIds.map((teamId) => {
          const team = teamById.get(teamId)
          const supervisor = supervisorFor(teamId)
          return (
            <article className="team-card" key={teamId}>
              <header>
                <span className="team-code">{teamId}</span>
                <div>
                  <strong>{team?.project}</strong>
                  <span>
                    {t('common.supervisor')}: {supervisor?.name}
                  </span>
                </div>
              </header>
              <ul className="student-chips" aria-label={t('common.students')}>
                {studentsOf(teamId).map((student) => {
                  const present = attendance[student.id] === 'present'
                  return (
                    <li key={student.id} className={present ? 'is-present' : 'is-absent'}>
                      <span className="presence-dot" aria-hidden="true" />
                      {student.name}
                      <span className="visually-hidden">, {t(present ? 'table.present' : 'table.absent')}</span>
                    </li>
                  )
                })}
              </ul>
              <button
                className="btn btn-sm btn-ghost"
                type="button"
                onClick={() => openDialog({ type: 'report', teamId })}
              >
                <FileText size={15} />
                {t('table.report')}
              </button>
            </article>
          )
        })}
      </div>
      {table.shape === 'round' && table.teamIds.length === 1 ? <p className="empty-note">{t('table.openPlace')}</p> : null}
    </Modal>
  )
}
