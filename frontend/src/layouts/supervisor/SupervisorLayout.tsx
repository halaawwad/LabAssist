import type { ReactNode } from 'react'
import { Box } from 'lucide-react'
import { sidebarItems } from '../../data/supervisor/supervisorMockData'

type SupervisorLayoutProps = {
  children: ReactNode
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
          {sidebarItems.slice(0, 11).map((item) => (
            <button
              className={`nav-item ${item.active ? 'is-active' : ''}`}
              key={item.label}
              type="button"
            >
              <item.icon size={21} />
              <span>{item.label}</span>
            </button>
          ))}
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

      <main className="dashboard-canvas">{children}</main>
    </div>
  )
}
