import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
import { useI18n } from '../../i18n/i18nContext'
import { useLocalState } from '../../state/useLocalState'
import { ActionDialog, ProjectSelect } from '../../components/supervisor/tasks/ActionDialog'
import { interactionLabels } from '../../components/supervisor/interactionLabels'
import { priorityLabelKeys } from '../../i18n/labels'
import { findProject } from '../../components/supervisor/tasks/taskHelpers'
import type { TaskPriority } from '../../data/supervisor/tasksMockData'

export function Tasks() {
  const { t, language } = useI18n()
  const l = interactionLabels[language]
  // `?open=reports` (used by notifications) opens the weekly reports dialog on arrival.
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useLocalState('tasks.v1', supervisorTasks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = tasks.find((task) => task.id === editingId)
  const [filter, setFilter] = useState<TaskFilter>('All')
  const [sort, setSort] = useState<TaskSort>('dueDate')
  const [openDialog, setOpenDialog] = useState<QuickActionId | null>(() =>
    searchParams.get('open') === 'reports' ? 'reports' : null,
  )
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
        task.id === id
          ? { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' }
          : task,
      ),
    )

  const addTask = (task: NewTask) =>
    setTasks((current) => [
      ...current,
      { ...task, id: `task-${current.length + 1}-${Date.now()}`, status: 'Pending' },
    ])

  const closeDialog = () => {
    setOpenDialog(null)
    if (searchParams.has('open')) setSearchParams({}, { replace: true })
  }

  const dialogProps = { onClose: closeDialog, onNotice: setNotice }

  return (
    <>
      <SupervisorTopBar />

      <section className="tasks-page" aria-labelledby="tasks-title">
        <div className="tasks-content">
          <header className="tasks-heading">
            <h1 id="tasks-title">{t('tasks.title')}</h1>
            <p>{t('tasks.subtitle')}</p>
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
            onOpenTask={setEditingId}
          />
        </div>

        <SupervisorPeopleVisual />
      </section>

      {openDialog === 'task' ? <CreateTaskDialog {...dialogProps} onCreate={addTask} /> : null}
      {openDialog === 'meeting' ? (
        <ScheduleMeetingDialog {...dialogProps} onCreate={addTask} />
      ) : null}
      {openDialog === 'feedback' ? <SendFeedbackDialog {...dialogProps} /> : null}
      {openDialog === 'reports' ? <ReportsDialog {...dialogProps} /> : null}
      {editing && (
        <ActionDialog
          title={l.task}
          description={l.local}
          icon={CircleCheck}
          onClose={() => setEditingId(null)}
          submitLabel={t('common.save')}
          onSubmit={(data) => {
            const project = findProject(String(data.get('project')))
            if (!project) return
            setTasks((items) =>
              items.map((task) =>
                task.id === editing.id
                  ? {
                      ...task,
                      title: String(data.get('title')).trim(),
                      projectCode: project.code,
                      projectName: project.name,
                      priority: data.get('priority') as TaskPriority,
                      dueDate: String(data.get('date')),
                    }
                  : task,
              ),
            )
            setEditingId(null)
          }}
        >
          <label className="dialog-field">
            <span>{l.title}</span>
            <input name="title" defaultValue={editing.title} required maxLength={100} />
          </label>
          <ProjectSelect defaultValue={editing.projectCode} />
          <label className="dialog-field">
            <span>{l.priority}</span>
            <select name="priority" defaultValue={editing.priority}>
              {(['Urgent', 'High', 'Medium', 'Low'] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {t(priorityLabelKeys[priority])}
                </option>
              ))}
            </select>
          </label>
          <label className="dialog-field">
            <span>{l.date}</span>
            <input name="date" type="date" defaultValue={editing.dueDate} required />
          </label>
        </ActionDialog>
      )}

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
