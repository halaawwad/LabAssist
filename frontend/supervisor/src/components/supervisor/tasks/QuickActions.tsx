import { ArrowRight, CalendarDays, ChartColumn, FilePlus2, MessageCircle } from 'lucide-react'
import type { QuickActionId } from './taskHelpers'

const quickActions: { id: QuickActionId; label: string; icon: typeof CalendarDays }[] = [
  { id: 'meeting', label: 'Schedule Meeting', icon: CalendarDays },
  { id: 'feedback', label: 'Send Feedback', icon: MessageCircle },
  { id: 'task', label: 'Create Task', icon: FilePlus2 },
  { id: 'reports', label: 'View Reports', icon: ChartColumn },
]

type QuickActionsProps = {
  onAction: (id: QuickActionId) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section className="tasks-section" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">Quick Actions</h2>
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
            <span>{action.label}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
