import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import type { ObservationStatus } from '../data/activity'
import { supervisorById, teamById } from '../data/teams'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'

type Filter = ObservationStatus | 'all'
const statuses: ObservationStatus[] = ['sent', 'seen', 'followUp']

export function SupervisorNotesPage() {
  const { t, formatDate } = useI18n()
  const { observations } = useWorkshop()
  const { openDialog } = useDialogs()
  const [filter, setFilter] = useState<Filter>('all')
  const rows = observations.filter((item) => filter === 'all' || item.status === filter)

  return (
    <div className="page">
      <PageHeader title={t('notes.title')} subtitle={t('notes.subtitle')} />
      <div className="page-toolbar">
        <FilterChips
          label={t('notes.title')}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('notes.all'), count: observations.length },
            ...statuses.map((status) => ({
              id: status,
              label: t(`notes.statuses.${status}`),
              count: observations.filter((item) => item.status === status).length,
            })),
          ]}
        />
        <button className="btn btn-primary" type="button" onClick={() => openDialog({ type: 'report' })}>
          <Plus size={18} />
          {t('notes.newObservation')}
        </button>
      </div>

      <section className="panel scroll-panel" aria-label={t('notes.title')}>
        <ul className="note-list">
          {rows.map((item) => {
            const supervisor = supervisorById.get(item.supervisorId)
            return (
              <li className="note-card" key={item.id}>
                <header>
                  <span className={`tag ${item.type === 'positive' ? 'tag-green' : item.type === 'unsafe' ? 'tag-red' : ''}`}>
                    {t(`report.types.${item.type}`)}
                  </span>
                  <span className={`note-status status-${item.status}`}>{t(`notes.statuses.${item.status}`)}</span>
                </header>
                <p className="note-team">
                  <strong>{item.teamId}</strong> · {teamById.get(item.teamId)?.project}
                </p>
                <p className="note-text">{item.note}</p>
                <footer>
                  {supervisor ? (
                    <span className="note-supervisor">
                      <Avatar name={supervisor.name} size="sm" />
                      {supervisor.name}
                    </span>
                  ) : null}
                  <time dateTime={item.date}>{formatDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                </footer>
              </li>
            )
          })}
        </ul>
        {rows.length === 0 ? <p className="empty-note">{t('notes.empty')}</p> : null}
      </section>
    </div>
  )
}
