import { CalendarDays, GraduationCap } from 'lucide-react'
import { supervisorTasksImage } from '../../../data/supervisor/tasksMockData'

export function SupervisorPeopleVisual() {
  return (
    <div className="tasks-people" aria-hidden="true">
      <span className="tasks-people-decor">
        <TodoListDrawing />
        <CalendarDays className="decor-calendar" strokeWidth={1.2} />
        <GraduationCap className="decor-cap" strokeWidth={1.2} />
      </span>
      <img src={supervisorTasksImage} alt="" />
    </div>
  )
}

/** Line drawing of a clipboard titled "To Do List" with ticked items. */
function TodoListDrawing() {
  const rows = [64, 90, 116]

  return (
    <svg className="decor-todo" viewBox="0 0 120 150" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="6" y="14" width="108" height="130" rx="12" />
      <rect x="38" y="5" width="44" height="18" rx="6" />
      <text x="60" y="45" textAnchor="middle" fill="currentColor" stroke="none" fontSize="13" fontWeight="700">
        To Do List
      </text>
      {rows.map((y, index) => (
        <g key={y}>
          <rect x="18" y={y - 8} width="15" height="15" rx="3.5" />
          {index < 2 ? <path d={`M21 ${y} l3.5 3.5 l6.5 -7`} /> : null}
          <path d={`M42 ${y} H100`} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}
