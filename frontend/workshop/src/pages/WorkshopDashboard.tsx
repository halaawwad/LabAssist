import { useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { AttendancePanel } from '../components/AttendancePanel'
import { AvailabilityPanel } from '../components/AvailabilityPanel'
import { HandoverPanel } from '../components/HandoverPanel'
import { PageHeader } from '../components/PageHeader'
import { ReportPanel } from '../components/ReportPanel'
import { SummaryStrip } from '../components/SummaryStrip'
import { tableMatches } from '../components/tableSearch'
import { MapLegend, WorkshopFloor } from '../components/WorkshopFloor'
import { workshopTables } from '../data/workshopTables'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'

const singleTables = workshopTables.filter((table) => table.shape === 'rect').length

export function WorkshopDashboard() {
  const { t, tp } = useI18n()
  const { openDialog } = useDialogs()
  const [query, setQuery] = useState('')
  const matches = query.trim() ? workshopTables.filter((table) => tableMatches(table, query)).length : null

  return (
    <div className="dashboard">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} search={{ value: query, onChange: setQuery }} />
      <SummaryStrip />

      <div className="dashboard-grid">
        <section className="panel map-panel" aria-labelledby="dash-map">
          <header className="map-header">
            <MapIcon size={28} strokeWidth={1.6} aria-hidden="true" />
            <div>
              <h2 id="dash-map">{t('map.title')}</h2>
              <p>
                {matches === null
                  ? t('map.meta', {
                      total: workshopTables.length,
                      single: singleTables,
                      double: workshopTables.length - singleTables,
                    })
                  : matches > 0
                    ? tp('map.matches', matches)
                    : t('map.noMatches', { query: query.trim() })}
              </p>
            </div>
            <MapLegend />
          </header>
          <WorkshopFloor query={query} onSelect={(code) => openDialog({ type: 'table', code })} />
        </section>

        <div className="side-stack">
          <AttendancePanel />
          <AvailabilityPanel />
          <HandoverPanel />
          <ReportPanel />
        </div>
      </div>
    </div>
  )
}
