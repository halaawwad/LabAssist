import { Check } from 'lucide-react'
import { projectMilestones } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'

type MilestoneTrackerProps = {
  /** Index of the stage currently in progress; earlier stages count as completed. */
  currentStage: number
}

export function MilestoneTracker({ currentStage }: MilestoneTrackerProps) {
  const { t } = useI18n()

  return (
    <ol className="milestone-tracker" aria-label={t('progress.milestones.aria')}>
      {projectMilestones.map((milestone, index) => {
        const state = index < currentStage ? 'done' : index === currentStage ? 'current' : 'upcoming'
        const stateLabel = t(
          state === 'done'
            ? 'progress.milestones.completed'
            : state === 'current'
              ? 'progress.milestones.inProgress'
              : 'progress.milestones.notStarted',
        )

        return (
          <li className={`milestone-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined} key={milestone}>
            <span className="milestone-dot" aria-hidden="true">
              {state === 'done' ? <Check size={16} strokeWidth={3} /> : null}
            </span>
            <span className="milestone-label">
              {t(`progress.milestones.names.${milestone}`)}
              <span className="visually-hidden">, {stateLabel}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
