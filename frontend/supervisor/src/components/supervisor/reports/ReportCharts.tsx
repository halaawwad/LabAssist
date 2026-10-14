import { useId, useState } from 'react'
import type { ReportWeek, WeeklyTeamReport } from '../../../data/supervisor/weeklyReportsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { progressTone, smoothPath, useAnimatedNumber, weekDays } from './reportHelpers'

// Drawing area in viewBox units; the SVG stretches to the panel (grid lines keep a 1px stroke).
const width = 700
const height = 180
const top = 8
const ticks = [100, 75, 50, 25, 0]

type WeeklyProgressChartProps = {
  week: ReportWeek
  reports: WeeklyTeamReport[]
}

/**
 * Average reported progress per day of the week, as one soft animated curve.
 * Days without submissions carry the nearest known value so the line stays continuous.
 */
export function WeeklyProgressChart({ week, reports }: WeeklyProgressChartProps) {
  const { t, formatDate } = useI18n()
  const gradientId = useId()
  const [hovered, setHovered] = useState<number | null>(null)

  const days = weekDays(week)
  const daily = days.map((day) => {
    const submitted = reports.filter((report) => report.submittedOn === day)
    return submitted.length ? submitted.reduce((sum, report) => sum + report.progress, 0) / submitted.length : null
  })
  const values = daily.map((value, index) => {
    const known = value ?? daily.slice(0, index).reverse().find((item) => item !== null) ?? daily.find((item) => item !== null) ?? 0
    return Math.round(known)
  })

  // Without hover, the tooltip rests on the week's peak.
  const peak = values.indexOf(Math.max(...values))
  const active = hovered ?? peak

  const x = (index: number) => (width / (days.length - 1)) * index
  const y = (value: number) => top + (height - top) * (1 - value / 100)
  const line = smoothPath(
    values.map((value, index) => [x(index), y(value)] as [number, number]),
    top,
    height,
  )
  const area = `${line} L${width},${height} L0,${height} Z`
  const left = (index: number) => `${(index / (days.length - 1)) * 100}%`
  const pointStyle = { left: left(active), top: `${(y(values[active]) / height) * 100}%` }

  return (
    <section className="reports-overview" aria-labelledby="reports-overview-title">
      <header className="reports-overview-header">
        <div>
          <h2 id="reports-overview-title">{t('reports.overview.title')}</h2>
          <p>{t('reports.overview.subtitle')}</p>
        </div>
        <span className="reports-legend">
          <i aria-hidden="true" />
          {t('reports.overview.series')}
        </span>
      </header>

      <div className="reports-chart">
        <ol className="reports-chart-ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <li style={{ top: `${(y(tick) / height) * 100}%` }} key={tick}>
              {tick}%
            </li>
          ))}
        </ol>

        <div className="reports-chart-plot" onPointerLeave={() => setHovered(null)}>
          {/* Re-keyed when the data changes so the draw-in animation replays. */}
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" key={`${week.id}-${values.join('-')}`}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" className="reports-chart-stop" stopOpacity="0.34" />
                <stop offset="100%" className="reports-chart-stop" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gradientId}-shimmer`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gradientId}-flow`} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="38%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="62%" stopColor="#fff" stopOpacity="0" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from={`${-width * 0.62} 0`}
                  to={`${width * 0.62} 0`}
                  dur="4.8s"
                  begin="1.6s"
                  repeatCount="indefinite"
                />
              </linearGradient>
              <clipPath id={`${gradientId}-area`}>
                <path d={area} />
              </clipPath>
            </defs>
            {ticks.map((tick) => (
              <line className="reports-chart-grid" x1="0" x2={width} y1={y(tick)} y2={y(tick)} vectorEffect="non-scaling-stroke" key={tick} />
            ))}
            <path className="reports-chart-area" d={area} fill={`url(#${gradientId})`} />
            {/* Ambient motion after the one-time draw-in: a light sweep across the area and a glow travelling the line. */}
            <g clipPath={`url(#${gradientId}-area)`}>
              <rect className="reports-chart-shimmer" x={-width / 4} y="0" width={width / 4} height={height} fill={`url(#${gradientId}-shimmer)`} />
            </g>
            <path className="reports-chart-line" d={line} pathLength={1} />
            <path className="reports-chart-glow" d={line} stroke={`url(#${gradientId}-flow)`} />
          </svg>

          <span className="reports-chart-guide" style={pointStyle} aria-hidden="true" />
          <span className="reports-chart-dot" style={pointStyle} key={`dot-${active}`} aria-hidden="true" />
          <div
            className={`reports-chart-tooltip ${active === 0 ? 'is-start' : active === days.length - 1 ? 'is-end' : ''}`}
            style={pointStyle}
            role="status"
            key={`tip-${active}`}
          >
            <strong>{values[active]}%</strong>
            <small>{formatDate(days[active], { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </div>

          <div className="reports-chart-hits">
            {days.map((day, index) => (
              <button
                type="button"
                aria-label={t('reports.overview.dayAria', { date: formatDate(day), value: values[index] })}
                onPointerEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => setHovered(index)}
                key={day}
              />
            ))}
          </div>
        </div>

        <ol className="reports-chart-days" aria-hidden="true">
          {days.map((day) => (
            <li key={day}>{formatDate(day)}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

type ProgressRingProps = {
  value: number
  label: string
  size?: 'md' | 'lg'
}

/** Circular progress that sweeps and counts up on load, and glides when the value changes. */
export function ProgressRing({ value, label, size = 'lg' }: ProgressRingProps) {
  const gradientId = useId()
  const shown = useAnimatedNumber(value)
  const radius = 42
  const circumference = 2 * Math.PI * radius

  return (
    <div className={`reports-ring is-${size} tone-${progressTone(value)}`} role="img" aria-label={`${label}: ${Math.round(value)}%`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" className="ring-stop-start" />
            <stop offset="100%" className="ring-stop-end" />
          </linearGradient>
        </defs>
        <circle className="reports-ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="reports-ring-value"
          cx="50"
          cy="50"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
        />
      </svg>
      <span className="reports-ring-copy" aria-hidden="true">
        <strong>{Math.round(shown)}%</strong>
        <small>{label}</small>
      </span>
    </div>
  )
}
