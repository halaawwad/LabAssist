import { CalendarDays, Clock3, FileText, FlaskConical, MapPin, Users, type LucideIcon } from 'lucide-react'
import type { ReviewKind, UpcomingReview } from '../../../data/supervisor/projectsMockData'
import { statusTone } from './projectHelpers'

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
  return (
    <section className="mp-side-section" aria-labelledby="mp-reviews-title">
      <div className="mp-side-heading">
        <h2 id="mp-reviews-title">Upcoming Reviews</h2>
        <a className="mp-view-all" href="#mp-reviews-title">
          View all
        </a>
      </div>

      <ol className="mp-timeline">
        {reviews.map((review) => {
          const Icon = kindIcons[review.kind]
          const detailsId = `${review.id}-details`

          return (
            <li className={`mp-review tone-${statusTone(review.status)}`} key={review.id}>
              <time className="mp-review-date">
                <span>{review.month}</span>
                <strong>{review.day}</strong>
              </time>
              <i className="mp-review-dot" aria-hidden="true" />
              {/* Focusable so keyboard users can open the details card too. */}
              <button className="mp-review-item" type="button" aria-describedby={detailsId}>
                <span className="mp-review-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span className="mp-review-copy">
                  <strong>{review.label}</strong>
                  <small>{review.projectShort}</small>
                  <small className="mp-review-place">
                    <MapPin size={13} aria-hidden="true" />
                    {review.location}
                  </small>
                </span>
              </button>

              <div className="mp-review-popover" id={detailsId} role="tooltip">
                <strong>{review.title}</strong>
                <span>{review.project}</span>
                <span>
                  <Clock3 size={15} aria-hidden="true" />
                  {review.time}
                </span>
                <span>
                  <MapPin size={15} aria-hidden="true" />
                  {review.location}
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
    </section>
  )
}
