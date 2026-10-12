import { ArrowRight, CalendarDays, ChartColumn, FilePlus2, MessageCircle } from 'lucide-react'
import { useI18n, type TranslationKey } from '../../../i18n/i18nContext'
import type { QuickActionId } from './taskHelpers'

const quickActions: { id: QuickActionId; label: TranslationKey; icon: typeof CalendarDays }[] = [
  { id: 'meeting', label: 'tasks.quickActions.meeting', icon: CalendarDays },
  { id: 'feedback', label: 'tasks.quickActions.feedback', icon: MessageCircle },
  { id: 'task', label: 'tasks.quickActions.task', icon: FilePlus2 },
  { id: 'reports', label: 'tasks.quickActions.reports', icon: ChartColumn },
]

type QuickActionsProps = {
  onAction: (id: QuickActionId) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { t } = useI18n()

  return (
    <section className="tasks-section" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">{t('tasks.quickActions.title')}</h2>
      <div className="tasks-quick-actions">
        {quickActions.map((action) => (
          <button
            className="tasks-quick-action"
            type="button"
            aria-haspopup="dialog"
            onClick={() => onAction(action.id)}
            key={action.id}
          >
            <action.icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{t(action.label)}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
