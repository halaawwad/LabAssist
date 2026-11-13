import { demoSupervisor } from "../../../../../shared/web/domain";
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, MonitorPlay } from 'lucide-react'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { Notice } from '../../components/supervisor/account/Notice'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { FinalReportsList, type FinalReportTab } from '../../components/supervisor/finalReports/FinalReportsList'
import { PresentationViewer } from '../../components/supervisor/finalReports/PresentationViewer'
import { ReportViewer } from '../../components/supervisor/finalReports/ReportViewer'
import { ReviewPanel } from '../../components/supervisor/finalReports/ReviewPanel'
import { StatusPill } from '../../components/supervisor/finalReports/StatusPill'
import { fill, finalReportsLabels } from '../../components/supervisor/finalReports/finalReportsLabels'
import {
  currentSubmission,
  downloadBlob,
  isCovered,
  presentationPdf,
  reportPdf,
  splitDateTime,
  todayIso,
} from '../../components/supervisor/finalReports/finalReportsHelpers'
import {
  finalReportProjects,
  finalReportReviews,
  type AbetCriterionId,
  type FinalReportFeedback,
  type FinalReportReview,
  type FinalReportStatus,
  type ReportSubmission,
} from '../../data/supervisor/finalReportsMockData'
import { useI18n } from '../../i18n/i18nContext'
import { useAccount } from '../../state/supervisor/accountContext'
import { useLocalState } from '../../state/useLocalState'
import '../../components/supervisor/finalReports/finalReports.css'

export function FinalReports() {
  const { profile } = useAccount()
  const { language } = useI18n()
  const [reviews, setReviews] = useLocalState<FinalReportReview[]>('final-reports.v2', finalReportReviews)
  const projectOptions = finalReportProjects.filter(project => project.supervisorIds.includes(profile.accountId ?? demoSupervisor.id) && reviews.some(review => review.id === project.id && review.submissions.at(-1)?.status !== 'draft'))
  if (!projectOptions.length) return <p role="status">{language === 'ar' ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0633\u0644\u064a\u0645\u0627\u062a \u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : 'No submitted reports from linked project groups. Private drafts are not available.'}</p>
  return <LinkedFinalReports key={projectOptions.map(p => p.id).join(",")} projectOptions={projectOptions} reviews={reviews} setReviews={setReviews} />
}
function LinkedFinalReports({ projectOptions, reviews, setReviews }: { projectOptions: typeof finalReportProjects; reviews: FinalReportReview[]; setReviews: (action: FinalReportReview[] | ((current: FinalReportReview[]) => FinalReportReview[])) => void }) {
  const { language, t, formatDate, formatTime } = useI18n()
  const l = finalReportsLabels[language]
  const { profile } = useAccount()
  const supervisorName = t('common.honorific', { name: profile.name })
  // The report itself is written in English, whatever the interface language.
  const documentSupervisor = `Dr. ${profile.name}`
  const [searchParams, setSearchParams] = useSearchParams()
  // v2: submission-based review records (v1 stored supervisor edits, which no longer exist).
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FinalReportStatus | 'all'>('all')
  const [tab, setTab] = useState<FinalReportTab>('report')
  const [pageIndex, setPageIndex] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [notice, setNotice] = useNotice()

  const project =
    projectOptions.find((item) => item.id === searchParams.get('project')) ?? projectOptions[0]
  // Stored records may predate a project added to the mock data: fall back to its defaults.
  const reviewFor = (id: string) =>
    reviews.find((item) => item.id === id) ?? finalReportReviews.find((item) => item.id === id)!
  const review = reviewFor(project.id)
  const submission = currentSubmission(review)

  const needle = query.trim().toLowerCase()
  const items = projectOptions
    .map((item) => ({ project: item, review: reviewFor(item.id) }))
    .filter(
      ({ project: item, review: itemReview }) =>
        (statusFilter === 'all' || currentSubmission(itemReview).status === statusFilter) &&
        (!needle ||
          [item.name, item.code, ...item.students.map((student) => student.name)].some((value) =>
            value.toLowerCase().includes(needle),
          )),
    )

  const updateReview = (change: (current: FinalReportReview) => Partial<FinalReportReview>) =>
    setReviews((current) => {
      const exists = current.some((item) => item.id === review.id)
      const base = exists ? current : [...current, review]
      return base.map((item) => (item.id === review.id ? { ...item, ...change(item) } : item))
    })

  /** Sets the review outcome of the version under review; the PDF itself is never changed. */
  const decide = (current: FinalReportReview, status: FinalReportStatus): ReportSubmission[] =>
    current.submissions.map((item, index) =>
      index === current.submissions.length - 1 ? { ...item, status, reviewedAt: todayIso() } : item,
    )

  const withFeedback = (current: FinalReportReview, text: string, kind: FinalReportFeedback['kind']) =>
    text
      ? [
          ...current.feedback,
          { id: crypto.randomUUID(), supervisorId: profile.accountId ?? demoSupervisor.id, text: text.trim(), date: todayIso(), version: currentSubmission(current).version, kind },
        ]
      : current.feedback

  const openProject = (id: string, nextTab?: FinalReportTab) => {
    if (id !== project.id) {
      setPageIndex(0)
      setSlideIndex(0)
      setSearchParams({ project: id }, { replace: true })
    }
    if (nextTab) setTab(nextTab)
  }

  const downloadReport = (id: string) => {
    const target = projectOptions.find((item) => item.id === id) ?? project
    const file = currentSubmission(reviewFor(target.id))
    downloadBlob(file.fileName, reportPdf(target, file, documentSupervisor))
    setNotice(fill(l.notices.download, { file: file.fileName }))
  }

  const openCriterion = (criterion: AbetCriterionId) => {
    const index = project.pages.findIndex((page) => page.id === project.criterionPages[criterion])
    setTab('report')
    if (index >= 0) setPageIndex(index)
  }

  const submittedLabel = (() => {
    if (!submission.submittedAt) return l.notSubmitted
    const [date, time] = splitDateTime(submission.submittedAt)
    return fill(l.submittedOn, {
      date: `${formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' })}, ${formatTime(time)}`,
    })
  })()

  return (
    <>
      <SupervisorTopBar />

      <section className="fr-page" aria-labelledby="fr-title">
        <header className="fr-heading">
          <h1 id="fr-title">{l.title}</h1>
          <p>{l.subtitle}</p>
        </header>

        <div className="fr-layout">
          <FinalReportsList
            items={items}
            selectedId={project.id}
            labels={l}
            query={query}
            onQueryChange={setQuery}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            onOpen={openProject}
            onDownload={downloadReport}
          />

          <div className="fr-main">
            <header className="fr-card fr-project-header">
              <img src={project.image} alt="" />
              <div className="fr-project-header-copy">
                <h2>{project.name}</h2>
                <p>{project.students.map((student) => `${student.name} (${student.id})`).join(', ')}</p>
                <p>
                  <b>{l.supervisor}:</b> {supervisorName}
                </p>
              </div>
              <div className="fr-project-header-meta">
                <StatusPill status={submission.status} labels={l} />
                <small>{submittedLabel}</small>
                <small>
                  {l.version} {submission.version}
                </small>
              </div>
            </header>

            <div className="fr-tabs" role="tablist" aria-label={l.tabsAria}>
              <button
                type="button"
                role="tab"
                id="fr-tab-report"
                aria-controls="fr-panel-report"
                aria-selected={tab === 'report'}
                className={tab === 'report' ? 'is-active' : undefined}
                onClick={() => setTab('report')}
              >
                <FileText size={18} strokeWidth={1.7} aria-hidden="true" />
                {l.tabReport}
              </button>
              <button
                type="button"
                role="tab"
                id="fr-tab-presentation"
                aria-controls="fr-panel-presentation"
                aria-selected={tab === 'presentation'}
                className={tab === 'presentation' ? 'is-active' : undefined}
                onClick={() => setTab('presentation')}
              >
                <MonitorPlay size={18} strokeWidth={1.7} aria-hidden="true" />
                {l.tabPresentation} <span>{l.viewOnly}</span>
              </button>
            </div>

            {/* Both panels stay mounted so each viewer keeps its page and zoom when switching tabs. */}
            <div className="fr-panel" role="tabpanel" id="fr-panel-report" aria-labelledby="fr-tab-report" hidden={tab !== 'report'}>
              <ReportViewer
                key={project.id}
                project={project}
                submission={submission}
                supervisor={documentSupervisor}
                labels={l}
                pageIndex={pageIndex}
                onPageChange={setPageIndex}
                onDownload={() => downloadReport(project.id)}
              />
            </div>
            <div
              className="fr-panel"
              role="tabpanel"
              id="fr-panel-presentation"
              aria-labelledby="fr-tab-presentation"
              hidden={tab !== 'presentation'}
            >
              <PresentationViewer
                key={project.id}
                project={project}
                labels={l}
                pageIndex={slideIndex}
                onPageChange={setSlideIndex}
                onDownload={() => {
                  downloadBlob(project.presentationFile.fileName, presentationPdf(project))
                  setNotice(fill(l.notices.download, { file: project.presentationFile.fileName }))
                }}
              />
            </div>
          </div>

          <ReviewPanel
            key={project.id}
            review={review}
            labels={l}
            supervisor={{ name: supervisorName, photo: profile.photo }}
            onToggleCriterion={(criterion) =>
              updateReview((current) => ({
                criteria: { ...current.criteria, [criterion]: !isCovered(current, criterion) },
              }))
            }
            onOpenCriterion={openCriterion}
            onSaveFeedback={(text) => {
              updateReview((current) => ({ feedback: withFeedback(current, text, 'comment') }))
              setNotice(fill(l.notices.feedback, { name: project.name }))
            }}
            onApprove={(text) => {
              updateReview((current) => ({
                feedback: withFeedback(current, text, 'approval'),
                submissions: decide(current, 'approved'),
              }))
              setNotice(fill(l.notices.approved, { name: project.name, version: submission.version }))
            }}
            onRequestRevision={(text) => {
              updateReview((current) => ({
                feedback: withFeedback(current, text, 'revision'),
                submissions: decide(current, 'revision'),
              }))
              setNotice(fill(l.notices.revision, { name: project.name }))
            }}
            onSimulateResubmission={() => setNotice("Only the student group can submit a new version. Cross-role delivery requires the backend.")}
          />
        </div>
      </section>

      <Notice message={notice} />
    </>
  )
}
