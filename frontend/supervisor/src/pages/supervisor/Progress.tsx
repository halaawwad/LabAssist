import { useState } from 'react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { MilestoneTracker } from '../../components/supervisor/progress/MilestoneTracker'
import { ProgressEvidencePanel } from '../../components/supervisor/progress/ProgressEvidencePanel'
import { ProgressHeroCard } from '../../components/supervisor/progress/ProgressHeroCard'
import { ProgressOverviewPanel } from '../../components/supervisor/progress/ProgressOverviewPanel'
import { ProgressProjectList } from '../../components/supervisor/progress/ProgressProjectList'
import { ProjectStudentsPanel } from '../../components/supervisor/progress/ProjectStudentsPanel'
import { SupervisorNotePanel } from '../../components/supervisor/progress/SupervisorNotePanel'
import { progressProjects } from '../../data/supervisor/progressMockData'

export function Progress() {
  const [selectedCode, setSelectedCode] = useState(progressProjects[0].code)
  const project = progressProjects.find((item) => item.code === selectedCode) ?? progressProjects[0]

  return (
    <div className="progress-page">
      <header className="progress-page-header">
        <h1>Progress</h1>
        <SupervisorTopBar />
      </header>

      <div className="progress-layout">
        <ProgressProjectList projects={progressProjects} selectedCode={project.code} onSelect={setSelectedCode} />

        <div className="progress-main-column">
          <ProgressHeroCard project={project} />
          <ProgressOverviewPanel project={project} />
          <MilestoneTracker currentStage={project.milestoneStage} />
        </div>

        <aside className="progress-side-column" aria-label={`${project.code} details`}>
          <ProjectStudentsPanel students={project.students} />
          <ProgressEvidencePanel project={project} />
          <SupervisorNotePanel note={project.note} />
        </aside>
      </div>
    </div>
  )
}
