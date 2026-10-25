import { ChevronRight, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'
import { Panel } from './Panel'

export function HandoverPanel() {
  const { t } = useI18n()
  const { handover } = useWorkshop()
  const checked = handover.filter((record) => record.checked).length

  const tiles = [
    { id: 'given', value: handover.length, label: t('handover.given') },
    { id: 'checked', value: checked, label: t('handover.checked') },
    { id: 'pending', value: handover.length - checked, label: t('handover.pending') },
  ]

  return (
    <Panel
      icon={Package}
      title={t('handover.title')}
      titleId="dash-handover"
      action={
        <Link className="icon-link" to="/handover" aria-label={t('handover.title')}>
          <ChevronRight size={20} className="flip-rtl" />
        </Link>
      }
    >
      <div className="mini-stats">
        {tiles.map((tile) => (
          <Link className={`mini-stat mini-${tile.id}`} key={tile.id} to={tile.id === 'pending' ? '/handover?view=pending' : '/handover'}>
            <strong>{tile.value}</strong>
            <span>{tile.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  )
}
