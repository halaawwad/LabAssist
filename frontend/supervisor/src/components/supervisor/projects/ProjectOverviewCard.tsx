import type { SupervisedProject } from '../../../data/supervisor/projectsMockData'
import { projectStatuses, statusTone } from './projectHelpers'

type ProjectOverviewCardProps = {
  projects: SupervisedProject[]
}

/** Gap between donut segments, in percent of the circumference. */
const segmentGap = 3

export function ProjectOverviewCard({ projects }: ProjectOverviewCardProps) {
  const total = projects.length
  const counts = projectStatuses.map((status) => ({
    status,
    count: projects.filter((project) => project.status === status).length,
  }))

  const visible = counts.filter(({ count }) => count > 0)
  const segments = visible.map(({ status, count }, index) => {
    const offset = visible.slice(0, index).reduce((sum, item) => sum + (item.count / total) * 100, 0)
    return { status, dash: Math.max(0, (count / total) * 100 - segmentGap), offset }
  })

  return (
    <section className="mp-side-section" aria-labelledby="mp-overview-title">
      <div className="mp-side-heading">
        <h2 id="mp-overview-title">Project Overview</h2>
        <a className="mp-view-all" href="#mp-others-title">
          View all
        </a>
      </div>

      <div className="mp-overview">
        <div className="mp-donut">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            {segments.map((segment) => (
              <circle
                className={`mp-donut-segment tone-${statusTone(segment.status)}`}
                cx="60"
                cy="60"
                r="50"
                pathLength="100"
                style={{ strokeDasharray: `${segment.dash} 100`, strokeDashoffset: -segment.offset }}
                key={segment.status}
              />
            ))}
          </svg>
          <div>
            <strong>{total}</strong>
            <span>Total Projects</span>
          </div>
        </div>

        <ul className="mp-legend">
          {counts.map(({ status, count }) => (
            <li className={`tone-${statusTone(status)}`} key={status}>
              <i aria-hidden="true" />
              <strong>{count}</strong>
              {status}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
