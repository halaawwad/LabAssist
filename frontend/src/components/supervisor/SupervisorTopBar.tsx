import { Bell, CalendarDays, ChevronDown, Search } from 'lucide-react'

export function SupervisorTopBar() {
  return (
    <div className="header-actions supervisor-topbar" aria-label="Supervisor tools">
      <label className="search-box">
        <Search size={22} aria-hidden="true" />
        <input type="search" placeholder="Search projects, students, reports..." />
        <kbd>Ctrl K</kbd>
      </label>

      <button className="icon-button notification-button" type="button" aria-label="Notifications">
        <Bell size={23} />
        <span aria-hidden="true" />
      </button>

      <button className="profile-pill" type="button" aria-label="Open profile menu">
        <span className="avatar">A</span>
        <ChevronDown size={19} />
      </button>

      <button className="semester-pill" type="button">
        <CalendarDays size={21} />
        <span>Fall 2026</span>
        <ChevronDown size={18} />
      </button>
    </div>
  )
}
