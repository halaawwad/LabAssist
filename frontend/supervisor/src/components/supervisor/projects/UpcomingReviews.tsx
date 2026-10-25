import {
  CalendarDays,
  Clock3,
  FileText,
  FlaskConical,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReviewKind, UpcomingReview } from '../../../data/supervisor/projectsMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { reviewLocationLabelKeys } from '../../../i18n/labels'
import { statusTone } from './projectHelpers'
import { useState } from 'react'
import { ActionDialog } from '../tasks/ActionDialog'
import { interactionLabels } from '../interactionLabels'

type UpcomingReviewsProps = {
  reviews: UpcomingReview[]
}

const kindIcons: Record<ReviewKind, LucideIcon> = {
  progress: CalendarDays,
  design: Users,
  final: FileText,
  demo: FlaskConical,
}

export function UpcomingReviews({ reviews }: UpcomingReviewsProps) {
  const { t, formatDate, formatTime, locale, language } = useI18n()
  const [open, setOpen] = useState<string | null>(null)
  const selected = reviews.filter((review) => open === 'all' || review.id === open)

  return (
    <section className="mp-side-section" aria-labelledby="mp-reviews-title">
      <div className="mp-side-heading">
        <h2 id="mp-reviews-title">{t('projects.reviews.title')}</h2>
        <a
          className="mp-view-all"
          href="#mp-reviews-title"
          onClick={(event) => {
            event.preventDefault()
            setOpen('all')
          }}
        >
          {t('common.viewAll')}
        </a>
      </div>

      <ol className="mp-timeline">
        {reviews.map((review) => {
          const Icon = kindIcons[review.kind]
          const detailsId = `${review.id}-details`
          const location = t(reviewLocationLabelKeys[review.location])

          return (
            <li className={`mp-review tone-${statusTone(review.status)}`} key={review.id}>
              <time className="mp-review-date" dateTime={review.date}>
                <span>{formatDate(review.date, { month: 'short' }).toLocaleUpperCase(locale)}</span>
                <strong>{formatDate(review.date, { day: 'numeric' })}</strong>
              </time>
              <i className="mp-review-dot" aria-hidden="true" />
              {/* Focusable so keyboard users can open the details card too. */}
              <button
                className="mp-review-item"
                type="button"
                aria-describedby={detailsId}
                onClick={() => setOpen(review.id)}
              >
                <span className="mp-review-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span className="mp-review-copy">
                  <strong>{t(`projects.reviews.kinds.${review.kind}.label`)}</strong>
                  <small>{review.projectShort}</small>
                  <small className="mp-review-place">
                    <MapPin size={13} aria-hidden="true" />
                    {location}
                  </small>
                </span>
              </button>

              <div className="mp-review-popover" id={detailsId} role="tooltip">
                <strong>{t(`projects.reviews.kinds.${review.kind}.title`)}</strong>
                <span>{review.project}</span>
                <span>
                  <Clock3 size={15} aria-hidden="true" />
                  {formatTime(review.time)}
                </span>
                <span>
                  <MapPin size={15} aria-hidden="true" />
                  {location}
                </span>
                <span>
                  <Users size={15} aria-hidden="true" />
                  {review.team}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      {open && (
        <ActionDialog
          title={interactionLabels[language][open === 'all' ? 'reviews' : 'review']}
          description={interactionLabels[language].local}
          icon={CalendarDays}
          onClose={() => setOpen(null)}
        >
          {selected.map((review) => (
            <section key={review.id}>
              <h3>{review.project}</h3>
              <p>
                {review.team} · {formatDate(review.date)} · {formatTime(review.time)}
              </p>
              <p>{t(reviewLocationLabelKeys[review.location])}</p>
            </section>
          ))}
        </ActionDialog>
      )}
    </section>
  )
}
