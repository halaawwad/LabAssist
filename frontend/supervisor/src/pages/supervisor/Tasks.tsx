import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import {
  CreateTaskDialog,
  ReportsDialog,
  ScheduleMeetingDialog,
  SendFeedbackDialog,
  type NewTask,
} from '../../components/supervisor/tasks/QuickActionDialogs'
import { QuickActions } from '../../components/supervisor/tasks/QuickActions'
import { SupervisorPeopleVisual } from '../../components/supervisor/tasks/SupervisorPeopleVisual'
import { TaskList } from '../../components/supervisor/tasks/TaskList'
import { TaskSummary } from '../../components/supervisor/tasks/TaskSummary'
import {
  compareTasks,
  matchesFilter,
  type QuickActionId,
  type TaskFilter,
  type TaskSort,
} from '../../components/supervisor/tasks/taskHelpers'
import { supervisorTasks, tasksMockToday } from '../../data/supervisor/tasksMockData'

export function Tasks() {
  const [tasks, setTasks] = useState(supervisorTasks)
  const [filter, setFilter] = useState<TaskFilter>('All')
  const [sort, setSort] = useState<TaskSort>('dueDate')
  const [openDialog, setOpenDialog] = useState<QuickActionId | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const visibleTasks = tasks
    .filter((task) => matchesFilter(task, filter, tasksMockToday))
    .sort((a, b) => compareTasks(a, b, sort))

  const toggleTask = (id: string) =>
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' } : task,
      ),
    )

  const addTask = (task: NewTask) =>
    setTasks((current) => [...current, { ...task, id: `task-${current.length + 1}-${Date.now()}`, status: 'Pending' }])

  const dialogProps = { onClose: () => setOpenDialog(null), onNotice: setNotice }

  return (
    <>
      <SupervisorTopBar />

      <section className="tasks-page" aria-labelledby="tasks-title">
        <div className="tasks-content">
          <header className="tasks-heading">
            <h1 id="tasks-title">Tasks</h1>
            <p>Stay on top of your supervision tasks.</p>
          </header>

          <TaskSummary tasks={tasks} />
          <QuickActions onAction={setOpenDialog} />
          <TaskList
            tasks={visibleTasks}
            today={tasksMockToday}
            filter={filter}
            sort={sort}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onToggleTask={toggleTask}
          />
        </div>

        <SupervisorPeopleVisual />
      </section>

      {openDialog === 'task' ? <CreateTaskDialog {...dialogProps} onCreate={addTask} /> : null}
      {openDialog === 'meeting' ? <ScheduleMeetingDialog {...dialogProps} onCreate={addTask} /> : null}
      {openDialog === 'feedback' ? <SendFeedbackDialog {...dialogProps} /> : null}
      {openDialog === 'reports' ? <ReportsDialog {...dialogProps} /> : null}

      <p className="tasks-notice" role="status">
        {notice ? (
          <>
            <CircleCheck size={18} aria-hidden="true" />
            {notice}
          </>
        ) : null}
      </p>
    </>
  )
}
