import type { ReactNode } from 'react'
import { Box } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { sidebarItems } from '../../data/supervisor/supervisorMockData'

type SupervisorLayoutProps = {
  children?: ReactNode
}

const supervisorRoutes: Record<string, string> = {
  Dashboard: '/supervisor/dashboard',
  'My Projects': '/supervisor/projects',
}

export function SupervisorLayout({ children }: SupervisorLayoutProps) {
  return (
    <div className="supervisor-shell">
      <aside className="supervisor-sidebar" aria-label="Supervisor navigation">
        <div className="brand-mark">
          <div className="brand-icon" aria-hidden="true">
            <Box size={32} strokeWidth={1.8} />
          </div>
          <div>
            <strong>LabAssist</strong>
            <span>Supervisor Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.slice(0, 11).map((item) => {
            const route = supervisorRoutes[item.label]

            if (route) {
              return (
                <NavLink
                  className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
                  key={item.label}
                  to={route}
                >
                  <item.icon size={21} />
                  <span>{item.label}</span>
                </NavLink>
              )
            }

            return (
              <button className="nav-item" key={item.label} type="button">
                <item.icon size={21} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <nav className="sidebar-nav sidebar-nav-bottom">
          {sidebarItems.slice(11).map((item) => (
            <button className="nav-item" key={item.label} type="button">
              <span className="nav-icon-with-badge">
                <item.icon size={21} />
                {item.badge ? <small>{item.badge}</small> : null}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-canvas">{children ?? <Outlet />}</main>
    </div>
  )
}
