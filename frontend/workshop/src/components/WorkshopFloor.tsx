import type { CSSProperties } from 'react'
import floorPlan from '../assets/workshop-floor-plan.webp'
import { floorSize, tableStatus, workshopTables, type TableStatus } from '../data/workshopTables'
import { useI18n } from '../i18n/i18nContext'
import { tableMatches } from './tableSearch'

type WorkshopFloorProps = {
  query?: string
  filter?: TableStatus | 'all'
  onSelect: (code: string) => void
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`

/** The workshop floor from above with a clickable hotspot, code and status marker on each table. */
export function WorkshopFloor({ query = '', filter = 'all', onSelect }: WorkshopFloorProps) {
  const { t } = useI18n()
  const searching = query.trim() !== ''

  // The floor image's proportions drive the frame, so the map always keeps its aspect ratio.
  const frameStyle = { '--floor-ratio': floorSize.width / floorSize.height } as CSSProperties

  return (
    <div className="floor-frame" style={frameStyle}>
      <div className="floor" role="group" aria-label={t('map.floorAria')}>
        <img className="floor-photo" src={floorPlan} alt="" draggable={false} />
        {workshopTables.map((table) => {
          const status = tableStatus(table)
          const visible = (filter === 'all' || filter === status) && tableMatches(table, query)
          const style: CSSProperties = {
            left: percent(table.cx - table.w / 2, floorSize.width),
            top: percent(table.cy - table.h / 2, floorSize.height),
            width: percent(table.w, floorSize.width),
            height: percent(table.h, floorSize.height),
          }
          return (
            <button
              key={table.code}
              type="button"
              className={`floor-table is-${table.shape} ${table.h > table.w ? 'is-portrait' : ''} ${visible ? (searching ? 'is-match' : '') : 'is-dimmed'}`}
              style={style}
              onClick={() => onSelect(table.code)}
              aria-label={t('map.tableAria', { code: table.code, status: t(`map.status.${status}`) })}
            >
              <span className="floor-code">{table.code}</span>
              <span className={`floor-marker status-${status}`} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MapLegend() {
  const { t } = useI18n()
  const statuses: TableStatus[] = ['assigned', 'free', 'shared']
  return (
    <ul className="map-legend">
      {statuses.map((status) => (
        <li key={status}>
          <span className={`status-dot status-${status}`} aria-hidden="true" />
          {t(`map.status.${status}`)}
        </li>
      ))}
    </ul>
  )
}
