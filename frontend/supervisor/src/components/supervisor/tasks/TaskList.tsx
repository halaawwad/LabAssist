import { CalendarDays, Check, ChevronDown, Ellipsis } from 'lucide-react'
import type { SupervisorTask } from '../../../data/supervisor/tasksMockData'
import { formatDueDate, type TaskFilter, type TaskSort } from './taskHelpers'

const filters: TaskFilter[] = ['All', 'Today', 'Pending', 'Completed']

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
  return (
    <section className="tasks-section tasks-list-section" aria-labelledby="task-list-title">
      <div className="tasks-list-heading">
        <h2 id="task-list-title">Task List</h2>
        <div className="tasks-list-controls">
          <div className="tasks-filters" role="group" aria-label="Filter tasks">
            {filters.map((item) => (
              <button type="button" aria-pressed={filter === item} onClick={() => onFilterChange(item)} key={item}>
                {item}
              </button>
            ))}
          </div>
          <label className="tasks-sort">
            <span>Sort by:</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as TaskSort)}>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>
      </div>

      <ul className="tasks-list">
        {tasks.map((task) => (
          <TaskRow task={task} today={today} onToggle={onToggleTask} key={task.id} />
        ))}
        {tasks.length === 0 ? <li className="tasks-empty">No tasks match this filter.</li> : null}
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
  const isDone = task.status === 'Completed'

  return (
    <li className={`tasks-row ${isDone ? 'is-done' : ''}`}>
      <button
        className="tasks-check"
        type="button"
        aria-pressed={isDone}
        aria-label={`${isDone ? 'Mark as pending' : 'Mark as done'}: ${task.title}`}
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
      <span className={`tasks-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      <span className="tasks-due">
        <CalendarDays size={16} aria-hidden="true" />
        {formatDueDate(task.dueDate, today)}
      </span>
      <span className={`tasks-status status-${task.status.toLowerCase()}`}>{task.status}</span>
      <button className="tasks-menu" type="button" aria-label={`More actions for ${task.title}`}>
        <Ellipsis size={20} />
      </button>
    </li>
  )
}
