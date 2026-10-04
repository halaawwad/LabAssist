import { Sun } from 'lucide-react'
import { SupervisorTopBar } from './SupervisorTopBar'

export function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div className="greeting">
        <span>Good morning,</span>
        <div className="greeting-name">
          <h1>Dr. Ahmad</h1>
          <Sun size={36} aria-hidden="true" />
        </div>
        <p>Here&apos;s a quick overview of your projects.</p>
      </div>

      <SupervisorTopBar />
    </header>
  )
}
