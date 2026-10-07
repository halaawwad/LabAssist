import { ActivityPanel } from '../../components/supervisor/ActivityPanel'
import { DashboardHeader } from '../../components/supervisor/DashboardHeader'
import { HardwareSupportCard } from '../../components/supervisor/HardwareSupportCard'
import { MeetingsPanel } from '../../components/supervisor/MeetingsPanel'
import { ProgressOverview } from '../../components/supervisor/ProgressOverview'
import { StatCard } from '../../components/supervisor/StatCard'
import { stats } from '../../data/supervisor/supervisorMockData'

export function SupervisorDashboard() {
  return (
    <>
      <DashboardHeader />

      <section className="stats-grid" aria-label="Project summary">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="dashboard-grid" aria-label="Supervisor dashboard details">
        <div className="main-stack">
          <ProgressOverview />
          <ActivityPanel />
        </div>
        <HardwareSupportCard />
        <MeetingsPanel />
      </section>
    </>
  )
}
