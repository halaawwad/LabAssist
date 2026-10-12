import { CalendarDays, Check, ChevronDown, Ellipsis } from 'lucide-react'
import type { SupervisorTask } from '../../../data/supervisor/tasksMockData'
import { useI18n, type TranslationKey } from '../../../i18n/i18nContext'
import { priorityLabelKeys, taskStatusLabelKeys } from '../../../i18n/labels'
import type { TaskFilter, TaskSort } from './taskHelpers'

const filters: TaskFilter[] = ['All', 'Today', 'Pending', 'Completed']

const filterLabelKeys: Record<TaskFilter, TranslationKey> = {
  All: 'tasks.filters.all',
  Today: 'tasks.filters.today',
  Pending: 'tasks.filters.pending',
  Completed: 'tasks.filters.completed',
}

type TaskListProps = {
  tasks: SupervisorTask[]
  today: string
  filter: TaskFilter
  sort: TaskSort
  onFilterChange: (filter: TaskFilter) => void
  onSortChange: (sort: TaskSort) => void
  onToggleTask: (id: string) => void
}

export function TaskList({ tasks, today, filter, sort, onFilterChange, onSortChange, onToggleTask }: TaskListProps) {
  const { t } = useI18n()

  return (
    <section className="tasks-section tasks-list-section" aria-labelledby="task-list-title">
      <div className="tasks-list-heading">
        <h2 id="task-list-title">{t('tasks.list.title')}</h2>
        <div className="tasks-list-controls">
          <div className="tasks-filters" role="group" aria-label={t('tasks.list.filterAria')}>
            {filters.map((item) => (
              <button type="button" aria-pressed={filter === item} onClick={() => onFilterChange(item)} key={item}>
                {t(filterLabelKeys[item])}
              </button>
            ))}
          </div>
          <label className="tasks-sort">
            <span>{t('tasks.list.sortBy')}</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as TaskSort)}>
              <option value="dueDate">{t('tasks.list.sortDueDate')}</option>
              <option value="priority">{t('tasks.list.sortPriority')}</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>
      </div>

      <ul className="tasks-list">
        {tasks.map((task) => (
          <TaskRow task={task} today={today} onToggle={onToggleTask} key={task.id} />
        ))}
        {tasks.length === 0 ? <li className="tasks-empty">{t('tasks.list.empty')}</li> : null}
      </ul>
    </section>
  )
}

type TaskRowProps = {
  task: SupervisorTask
  today: string
  onToggle: (id: string) => void
}

function TaskRow({ task, today, onToggle }: TaskRowProps) {
  const { t, formatDay } = useI18n()
  const isDone = task.status === 'Completed'

  return (
    <li className={`tasks-row ${isDone ? 'is-done' : ''}`}>
      <button
        className="tasks-check"
        type="button"
        aria-pressed={isDone}
        aria-label={t(isDone ? 'tasks.list.markPending' : 'tasks.list.markDone', { title: task.title })}
        onClick={() => onToggle(task.id)}
      >
        {isDone ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
      </button>
      <div className="tasks-row-copy">
        <strong>{task.title}</strong>
        <small>
          {task.projectCode} · {task.projectName}
        </small>
      </div>
      <span className={`tasks-priority priority-${task.priority.toLowerCase()}`}>{t(priorityLabelKeys[task.priority])}</span>
      <span className="tasks-due">
        <CalendarDays size={16} aria-hidden="true" />
        {formatDay(task.dueDate, today)}
      </span>
      <span className={`tasks-status status-${task.status.toLowerCase()}`}>{t(taskStatusLabelKeys[task.status])}</span>
      <button className="tasks-menu" type="button" aria-label={t('tasks.list.more', { title: task.title })}>
        <Ellipsis size={20} />
      </button>
    </li>
  )
}
