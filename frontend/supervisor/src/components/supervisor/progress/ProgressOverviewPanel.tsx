import { TrendingDown, TrendingUp } from 'lucide-react'
import { progressChartWeeks, type ProjectProgress } from '../../../data/supervisor/progressMockData'
import { progressMetrics, projectProgress } from './progressHelpers'

type ProgressOverviewPanelProps = {
  project: ProjectProgress
}

const gridLines = [100, 75, 50, 25, 0]

export function ProgressOverviewPanel({ project }: ProgressOverviewPanelProps) {
  const { overall, weeklyChange } = progressMetrics(project)
  const completedWeeks = project.weeklyProgress.length
  const totalWeeks = Math.max(progressChartWeeks, completedWeeks)
  const xOf = (weekIndex: number) => (weekIndex / (totalWeeks - 1)) * 100

  const toPoint = (value: number, weekIndex: number) => ({ x: xOf(weekIndex), y: 100 - value, weekIndex })
  const actual = project.weeklyProgress.map(toPoint)
  const current = actual[actual.length - 1]
  const projected = projectProgress(project.weeklyProgress, totalWeeks - completedWeeks).map((value, i) =>
    toPoint(value, completedWeeks + i),
  )

  const line = (points: { x: number; y: number }[]) => points.map(({ x, y }) => `${x},${y}`).join(' ')
  const area = current ? `${actual[0].x},100 ${line(actual)} ${current.x},100` : ''
  const ChangeIcon = weeklyChange >= 0 ? TrendingUp : TrendingDown

  return (
    <section className="progress-overview" aria-label={`${project.code} progress overview`}>
      <div className="progress-overview-ring">
        <div className="progress-ring" aria-label={`${overall} percent complete`}>
          <svg viewBox="0 0 120 120" role="presentation" aria-hidden="true">
            <defs>
              <linearGradient id="progress-ring-gradient" gradientUnits="userSpaceOnUse" x1="110" y1="110" x2="10" y2="10">
                <stop offset="0" className="stop-dark" />
                <stop offset="1" className="stop-soft" />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="60" cy="60" r="50" />
            <circle
              className="ring-value"
              cx="60"
              cy="60"
              r="50"
              pathLength="100"
              style={{ strokeDasharray: `${overall} 100` }}
            />
          </svg>
          <div>
            <strong>{overall}%</strong>
            <span>Complete</span>
          </div>
        </div>
        <span className="progress-overview-change">
          <ChangeIcon size={18} strokeWidth={2.4} aria-hidden="true" />
          {weeklyChange >= 0 ? '+' : '−'}
          {Math.abs(weeklyChange)}% this week
        </span>
      </div>

      <figure
        className="progress-chart"
        aria-label={`Weekly progress of ${project.code}: ${overall}% in week ${completedWeeks}. Dashed line shows the projection at the current pace.`}
      >
        <div className="progress-chart-y" aria-hidden="true">
          {gridLines.map((value) => (
            <span style={{ top: `${100 - value}%` }} key={value}>
              {value}%
            </span>
          ))}
        </div>

        <div className="progress-chart-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="progress-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="stop-area-top" />
                <stop offset="1" className="stop-area-bottom" />
              </linearGradient>
            </defs>
            {gridLines.map((value) => (
              <line className="progress-chart-grid" x1="0" x2="100" y1={100 - value} y2={100 - value} key={`h${value}`} />
            ))}
            {Array.from({ length: totalWeeks }, (_, weekIndex) => (
              <line className="progress-chart-grid" x1={xOf(weekIndex)} x2={xOf(weekIndex)} y1="0" y2="100" key={`v${weekIndex}`} />
            ))}
            <polygon className="progress-chart-area" points={area} />
            {current ? <polyline className="progress-chart-projection" points={line([current, ...projected])} /> : null}
            <polyline className="progress-chart-line" points={line(actual)} />
          </svg>

          {actual.slice(0, -1).map((point) => (
            <i className="progress-chart-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-hidden="true" key={point.weekIndex} />
          ))}
          {projected.map((point) => (
            <i
              className="progress-chart-dot is-projected"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              aria-hidden="true"
              key={point.weekIndex}
            />
          ))}
          {current ? (
            <span className="progress-chart-marker" style={{ left: `${current.x}%`, top: `${current.y}%` }} aria-hidden="true">
              <b>
                {overall}%<small>Week {completedWeeks}</small>
              </b>
            </span>
          ) : null}
        </div>

        <div className="progress-chart-x" aria-hidden="true">
          {Array.from({ length: totalWeeks }, (_, weekIndex) => (
            <span
              className={weekIndex >= completedWeeks ? 'is-upcoming' : undefined}
              style={{ left: `${xOf(weekIndex)}%` }}
              key={weekIndex}
            >
              W{weekIndex + 1}
            </span>
          ))}
        </div>
      </figure>
    </section>
  )
}
