import { CircleAlert, CircleCheck, ClipboardCheck, Clock3, type LucideIcon } from 'lucide-react'
import type { SupervisorTask } from '../../../data/supervisor/tasksMockData'
import { useI18n, type TranslationKey } from '../../../i18n/i18nContext'

type TaskSummaryProps = {
  tasks: SupervisorTask[]
}

export function TaskSummary({ tasks }: TaskSummaryProps) {
  const { t } = useI18n()
  // Open tasks are split into Urgent and Pending, so the three counts add up to the total.
  const open = tasks.filter((task) => task.status === 'Pending')
  const urgent = open.filter((task) => task.priority === 'Urgent').length
  const items: { label: TranslationKey; value: number; tone: string; icon: LucideIcon }[] = [
    { label: 'tasks.summary.total', value: tasks.length, tone: 'total', icon: ClipboardCheck },
    { label: 'tasks.summary.completed', value: tasks.length - open.length, tone: 'done', icon: CircleCheck },
    { label: 'tasks.summary.pending', value: open.length - urgent, tone: 'pending', icon: Clock3 },
    { label: 'tasks.summary.urgent', value: urgent, tone: 'urgent', icon: CircleAlert },
  ]

  return (
    <ul className="tasks-summary" aria-label={t('tasks.summary.aria')}>
      {items.map((item) => (
        <li className={`tasks-summary-item tone-${item.tone}`} key={item.label}>
          <span className="tasks-summary-icon" aria-hidden="true">
            <item.icon size={24} strokeWidth={1.9} />
          </span>
          <strong>{item.value}</strong>
          <span>{t(item.label)}</span>
        </li>
      ))}
    </ul>
  )
}
