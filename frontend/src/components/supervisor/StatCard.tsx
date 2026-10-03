import { ArrowRight, TrendingUp } from 'lucide-react'
import type { StatCard as StatCardType } from '../../data/supervisorMockData'

type StatCardProps = {
  stat: StatCardType
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <article className={`stat-card tone-${stat.tone} ${stat.highlighted ? 'is-highlighted' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-icon">
          <stat.icon size={26} />
        </span>
        <button className="round-arrow" type="button" aria-label={`Open ${stat.label}`}>
          <ArrowRight size={23} />
        </button>
      </div>
      <div>
        <h2>{stat.label}</h2>
        <strong>{stat.value}</strong>
        <p>
          <TrendingUp size={16} />
          {stat.trend}
        </p>
      </div>
    </article>
  )
}
