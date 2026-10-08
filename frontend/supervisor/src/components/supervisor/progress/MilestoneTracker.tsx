import { Check } from 'lucide-react'
import { projectMilestones } from '../../../data/supervisor/progressMockData'

type MilestoneTrackerProps = {
  /** Index of the stage currently in progress; earlier stages count as completed. */
  currentStage: number
}

export function MilestoneTracker({ currentStage }: MilestoneTrackerProps) {
  return (
    <ol className="milestone-tracker" aria-label="Project milestones">
      {projectMilestones.map((milestone, index) => {
        const state = index < currentStage ? 'done' : index === currentStage ? 'current' : 'upcoming'
        const stateLabel = state === 'done' ? 'completed' : state === 'current' ? 'in progress' : 'not started'

        return (
          <li className={`milestone-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined} key={milestone}>
            <span className="milestone-dot" aria-hidden="true">
              {state === 'done' ? <Check size={16} strokeWidth={3} /> : null}
            </span>
            <span className="milestone-label">
              {milestone}
              <span className="visually-hidden">, {stateLabel}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
