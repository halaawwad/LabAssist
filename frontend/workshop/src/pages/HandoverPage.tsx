import { BellRing, PackageCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { teamById } from '../data/teams'
import { tableOfTeam } from '../data/workshopTables'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'

type View = 'all' | 'pending' | 'checked'
const views: View[] = ['all', 'pending', 'checked']

export function HandoverPage() {
  const { t, formatDate } = useI18n()
  const { handover } = useWorkshop()
  const { openDialog } = useDialogs()
  const [params, setParams] = useSearchParams()
  const view = (views as string[]).includes(params.get('view') ?? '') ? (params.get('view') as View) : 'all'

  const checked = handover.filter((record) => record.checked).length
  // Pending returns first: they are what the manager still has to do.
  const rows = handover
    .filter((record) => view === 'all' || (view === 'checked') === record.checked)
    .sort((a, b) => Number(a.checked) - Number(b.checked))

  return (
    <div className="page">
      <PageHeader title={t('handover.title')} subtitle={t('handover.subtitle')} />
      <div className="page-toolbar">
        <FilterChips
          label={t('handover.title')}
          value={view}
          onChange={(next) => setParams(next === 'all' ? {} : { view: next }, { replace: true })}
          options={[
            { id: 'all', label: t('handover.filters.all'), count: handover.length },
            { id: 'pending', label: t('handover.filters.pending'), count: handover.length - checked },
            { id: 'checked', label: t('handover.filters.checked'), count: checked },
          ]}
        />
      </div>

      <section className="panel scroll-panel" aria-label={t('handover.title')}>
        <ul className="handover-list">
          {rows.map((record) => (
            <li className={`handover-row ${record.checked ? '' : 'is-pending'}`} key={record.teamId}>
              <span className="team-code">{record.teamId}</span>
              <div className="handover-main">
                <strong>{teamById.get(record.teamId)?.project}</strong>
                <span className="person-meta">
                  {tableOfTeam(record.teamId)?.code} · {t('handover.dateGiven', { date: formatDate(record.dateGiven) })}
                </span>
                <ul className="item-chips" aria-label={t('handover.items')}>
                  {record.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="handover-state">
                {record.checked ? (
                  <>
                    <span className="tag tag-green">
                      {t('handover.checkedStatus')}
                      {record.checkedOn ? ` · ${formatDate(record.checkedOn)}` : ''}
                    </span>
                    {record.condition ? (
                      <span className={`tag condition-tag condition-${record.condition}`}>
                        {t(`handover.conditions.${record.condition}`)}
                      </span>
                    ) : null}
                    {record.note ? <p className="handover-note">{record.note}</p> : null}
                  </>
                ) : (
                  <span className="tag tag-warm">{t('handover.pendingStatus')}</span>
                )}
              </div>
              <div className="row-actions">
                {!record.checked ? (
                  <button
                    className="btn btn-sm btn-ghost"
                    type="button"
                    onClick={() => openDialog({ type: 'notice', audience: record.teamId, kind: 'returnItems' })}
                  >
                    <BellRing size={15} />
                    {t('handover.remind')}
                  </button>
                ) : null}
                <button
                  className={`btn btn-sm ${record.checked ? 'btn-ghost' : 'btn-soft'}`}
                  type="button"
                  onClick={() => openDialog({ type: 'returnCheck', teamId: record.teamId })}
                >
                  <PackageCheck size={15} />
                  {t('handover.checkReturn')}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? <p className="empty-note">{t('handover.empty')}</p> : null}
      </section>
    </div>
  )
}
