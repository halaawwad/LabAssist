import { useState } from 'react'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { StatusDot } from '../components/StatusDot'
import { tableMatches } from '../components/tableSearch'
import { MapLegend, WorkshopFloor } from '../components/WorkshopFloor'
import { teamById } from '../data/teams'
import { tableStatus, workshopTables, type TableStatus } from '../data/workshopTables'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'

type Filter = TableStatus | 'all'
const filters: Filter[] = ['all', 'assigned', 'free', 'shared']

export function WorkshopMapPage() {
  const { t } = useI18n()
  const { openDialog } = useDialogs()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const listed = workshopTables.filter(
    (table) => (filter === 'all' || tableStatus(table) === filter) && tableMatches(table, query),
  )

  return (
    <div className="page">
      <PageHeader title={t('mapPage.title')} subtitle={t('mapPage.subtitle', { total: workshopTables.length })} search={{ value: query, onChange: setQuery }} />
      <div className="page-toolbar">
        <FilterChips
          label={t('mapPage.title')}
          value={filter}
          onChange={setFilter}
          options={filters.map((id) => ({
            id,
            label: t(`mapPage.filters.${id}`),
            count: id === 'all' ? workshopTables.length : workshopTables.filter((table) => tableStatus(table) === id).length,
          }))}
        />
        <MapLegend />
      </div>

      <div className="split-layout">
        <section className="panel map-panel map-panel-large" aria-label={t('map.title')}>
          <WorkshopFloor query={query} filter={filter} onSelect={(code) => openDialog({ type: 'table', code })} />
        </section>

        <section className="panel list-panel" aria-label={t('mapPage.title')}>
          <ul className="table-list">
            {listed.map((table) => {
              const status = tableStatus(table)
              return (
                <li key={table.code}>
                  <button type="button" onClick={() => openDialog({ type: 'table', code: table.code })}>
                    <span className={`table-badge is-${table.shape}`}>{table.code}</span>
                    <span className="table-list-text">
                      <strong>
                        {table.teamIds.length
                          ? table.teamIds.map((teamId) => teamById.get(teamId)?.project).join(' · ')
                          : t('map.status.free')}
                      </strong>
                      <span>
                        {t(table.shape === 'rect' ? 'table.rect' : 'table.round')} ·{' '}
                        {t(table.shape === 'rect' ? 'table.capacityOne' : 'table.capacityTwo')}
                      </span>
                    </span>
                    <StatusDot status={status} />
                  </button>
                </li>
              )
            })}
          </ul>
          {listed.length === 0 ? <p className="empty-note">{t('common.noResults')}</p> : null}
        </section>
      </div>
    </div>
  )
}
