import { CircleAlert, CircleCheck, ClipboardCheck, Clock3, type LucideIcon } from 'lucide-react'
import type { SupervisorTask } from '../../../data/supervisor/tasksMockData'

type TaskSummaryProps = {
  tasks: SupervisorTask[]
}

export function TaskSummary({ tasks }: TaskSummaryProps) {
  // Open tasks are split into Urgent and Pending, so the three counts add up to the total.
  const open = tasks.filter((task) => task.status === 'Pending')
  const urgent = open.filter((task) => task.priority === 'Urgent').length
  const items: { label: string; value: number; tone: string; icon: LucideIcon }[] = [
    { label: 'Total Tasks', value: tasks.length, tone: 'total', icon: ClipboardCheck },
    { label: 'Completed', value: tasks.length - open.length, tone: 'done', icon: CircleCheck },
    { label: 'Pending', value: open.length - urgent, tone: 'pending', icon: Clock3 },
    { label: 'Urgent', value: urgent, tone: 'urgent', icon: CircleAlert },
  ]

  return (
    <ul className="tasks-summary" aria-label="Task summary">
      {items.map((item) => (
        <li className={`tasks-summary-item tone-${item.tone}`} key={item.label}>
          <span className="tasks-summary-icon" aria-hidden="true">
            <item.icon size={24} strokeWidth={1.9} />
          </span>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
