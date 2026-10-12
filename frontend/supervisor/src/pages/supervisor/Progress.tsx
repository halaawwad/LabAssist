import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { MilestoneTracker } from '../../components/supervisor/progress/MilestoneTracker'
import { ProgressEvidencePanel } from '../../components/supervisor/progress/ProgressEvidencePanel'
import { ProgressHeroCard } from '../../components/supervisor/progress/ProgressHeroCard'
import { ProgressOverviewPanel } from '../../components/supervisor/progress/ProgressOverviewPanel'
import { ProgressProjectList } from '../../components/supervisor/progress/ProgressProjectList'
import { ProjectStudentsPanel } from '../../components/supervisor/progress/ProjectStudentsPanel'
import { SupervisorNotePanel } from '../../components/supervisor/progress/SupervisorNotePanel'
import { progressProjects } from '../../data/supervisor/progressMockData'
import { useI18n } from '../../i18n/i18nContext'

export function Progress() {
  const { t } = useI18n()
  // `?project=CODE` (used by notifications) preselects a project.
  const [searchParams] = useSearchParams()
  const [selectedCode, setSelectedCode] = useState(() => searchParams.get('project') ?? progressProjects[0].code)
  const project = progressProjects.find((item) => item.code === selectedCode) ?? progressProjects[0]

  return (
    <div className="progress-page">
      <header className="progress-page-header">
        <h1>{t('progress.title')}</h1>
        <SupervisorTopBar />
      </header>

      <div className="progress-layout">
        <ProgressProjectList projects={progressProjects} selectedCode={project.code} onSelect={setSelectedCode} />

        <div className="progress-main-column">
          <ProgressHeroCard project={project} />
          <ProgressOverviewPanel project={project} />
          <MilestoneTracker currentStage={project.milestoneStage} />
        </div>

        <aside className="progress-side-column" aria-label={t('progress.detailsAria', { code: project.code })}>
          <ProjectStudentsPanel students={project.students} />
          <ProgressEvidencePanel project={project} />
          <SupervisorNotePanel note={project.note} />
        </aside>
      </div>
    </div>
  )
}
