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
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCode, setSelectedCode] = useState(
    () => searchParams.get('project') ?? progressProjects[0].code,
  )
  const requestedProject = searchParams.get('project')
  const project =
    progressProjects.find((item) => item.code === (requestedProject ?? selectedCode)) ??
    progressProjects[0]
  const selectProject = (code: string) => {
    setSelectedCode(code)
    if (searchParams.has('project'))
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('project')
          return next
        },
        { replace: true },
      )
  }

  return (
    <div className="progress-page">
      <header className="progress-page-header">
        <h1>{t('progress.title')}</h1>
        <SupervisorTopBar />
      </header>

      <div className="progress-layout">
        <ProgressProjectList
          projects={progressProjects}
          selectedCode={project.code}
          onSelect={selectProject}
        />

        <div className="progress-main-column">
          <ProgressHeroCard project={project} />
          <ProgressOverviewPanel project={project} />
          <MilestoneTracker currentStage={project.milestoneStage} />
        </div>

        <aside
          className="progress-side-column"
          aria-label={t('progress.detailsAria', { code: project.code })}
        >
          <ProjectStudentsPanel students={project.students} />
          <ProgressEvidencePanel project={project} />
          <SupervisorNotePanel key={project.code} note={project.note} projectCode={project.code} />
        </aside>
      </div>
    </div>
  )
}
