import { Armchair, Package, UserX, Users } from 'lucide-react'
import { tableStatus, workshopTables } from '../data/workshopTables'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

/** The four daily indicators: compact, no charts. */
export function SummaryStrip() {
  const { t } = useI18n()
  const { attendance, handover } = useWorkshop()
  const statuses = Object.values(attendance)
  const assigned = workshopTables.filter((table) => tableStatus(table) !== 'free').length

  const tiles = [
    { id: 'present', icon: Users, value: String(statuses.filter((status) => status === 'present').length), label: t('summary.present') },
    { id: 'absent', icon: UserX, value: String(statuses.filter((status) => status === 'absent').length), label: t('summary.absent') },
    { id: 'tables', icon: Armchair, value: `${assigned} / ${workshopTables.length}`, label: t('summary.tables') },
    { id: 'pending', icon: Package, value: String(handover.filter((record) => !record.checked).length), label: t('summary.pending') },
  ]

  return (
    <section className="summary-strip" aria-label={t('summary.aria')}>
      {tiles.map((tile) => (
        <article className={`summary-tile tile-${tile.id}`} key={tile.id}>
          <span className="summary-icon" aria-hidden="true">
            <tile.icon size={28} strokeWidth={1.8} />
          </span>
          <div>
            <strong>{tile.value}</strong>
            <span>{tile.label}</span>
          </div>
        </article>
      ))}
    </section>
  )
}
