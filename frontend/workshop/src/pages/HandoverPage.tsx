import { useState } from 'react';
import { BellRing, PackageCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { teamById, teams } from '../data/teams'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'
import { useWorkshop } from '../state/workshopContext'

type View = 'all' | 'pending' | 'checked'
const views: View[] = ['all', 'pending', 'checked']

export function HandoverPage() {
  const { tables } = useWorkshop();
  const tableOfTeam = (id: string) => tables.find(table => table.teamIds.includes(id));
  const { t, formatDate, language } = useI18n()
  const { handover, recordHandover } = useWorkshop()
  const [newHandover, setNewHandover] = useState(false)
  const [team, setTeam] = useState("")
  const [items, setItems] = useState("")
  const [saveError, setSaveError] = useState("")
  const { openDialog } = useDialogs()
  const [params, setParams] = useSearchParams()
  const view = (views as string[]).includes(params.get('view') ?? '') ? (params.get('view') as View) : 'all'

  const checked = handover.filter((record) => record.checked).length
  // Pending returns first: they are what the manager still has to do.
  const rows = handover
    .filter((record) => view === 'all' || (view === 'checked') === record.checked)
    .sort((a, b) => Number(a.checked) - Number(b.checked))

  return (
    <div className="page">
      <PageHeader title={t('handover.title')} subtitle={t('handover.subtitle')} />
      <button className="btn btn-primary" onClick={() => setNewHandover(!newHandover)}>{language === 'ar' ? 'تسجيل تسليم' : 'Record handover'}</button>
      {newHandover && <form className="panel form-stack" onSubmit={event => {
        event.preventDefault();
        try { recordHandover(team, items.split(",").map(item => item.trim()).filter(Boolean)); setNewHandover(false); setItems(""); setSaveError(""); }
        catch (cause) { setSaveError(cause instanceof Error ? cause.message : "Could not save. Try again."); }
      }}>
        <label>{language === 'ar' ? 'مجموعة المشروع' : 'Project group'}<select aria-label={language === "ar" ? "\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639" : "Project group"} className="input" value={team} onChange={event => setTeam(event.target.value)}><option value="">{language === 'ar' ? 'اختر المشروع' : 'Select a project'}</option>{teams.map(t => <option key={t.id} value={t.id}>{t.id} - {t.project}</option>)}</select></label>
        <label>{language === 'ar' ? 'أسماء الأدوات (قطعة من كل نوع، مفصولة بفاصلة)' : 'Item names (one of each, separated by commas)'}<input className="input" value={items} onChange={event => setItems(event.target.value)} /></label>
        {saveError && <p role="alert">{saveError}</p>}
        <button className="btn btn-primary" disabled={!team || !items.trim()}>{language === 'ar' ? 'حفظ التسليم' : 'Save handover'}</button>
      </form>}
      <div className="page-toolbar">
        <FilterChips
          label={t('handover.title')}
          value={view}
          onChange={(next) => setParams(next === 'all' ? {} : { view: next }, { replace: true })}
          options={[
            { id: 'all', label: t('handover.filters.all'), count: handover.length },
            { id: 'pending', label: t('handover.filters.pending'), count: handover.length - checked },
            { id: 'checked', label: t('handover.filters.checked'), count: checked },
          ]}
        />
      </div>

      <section className="panel scroll-panel" aria-label={t('handover.title')}>
        <ul className="handover-list">
          {rows.map((record) => (
            <li className={`handover-row ${record.checked ? '' : 'is-pending'}`} key={record.teamId}>
              <span className="team-code">{record.teamId}</span>
              <div className="handover-main">
                <strong>{teamById.get(record.teamId)?.project}</strong>
                <span className="person-meta">
                  {tableOfTeam(record.teamId)?.code} · {t('handover.dateGiven', { date: formatDate(record.dateGiven) })}
                </span>
                <ul className="item-chips" aria-label={t('handover.items')}>
                  {record.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="handover-state">
                {record.checked ? (
                  <>
                    <span className="tag tag-green">
                      {t('handover.checkedStatus')}
                      {record.checkedOn ? ` · ${formatDate(record.checkedOn)}` : ''}
                    </span>
                    {record.condition ? (
                      <span className={`tag condition-tag condition-${record.condition}`}>
                        {t(`handover.conditions.${record.condition}`)}
                      </span>
                    ) : null}
                    {record.note ? <p className="handover-note">{record.note}</p> : null}
                  </>
                ) : (
                  <span className="tag tag-warm">{t('handover.pendingStatus')}</span>
                )}
              </div>
              <div className="row-actions">
                {!record.checked ? (
                  <button
                    className="btn btn-sm btn-ghost"
                    type="button"
                    onClick={() => openDialog({ type: 'notice', audience: record.teamId, kind: 'returnItems' })}
                  >
                    <BellRing size={15} />
                    {t('handover.remind')}
                  </button>
                ) : null}
                <button
                  className={`btn btn-sm ${record.checked ? 'btn-ghost' : 'btn-soft'}`}
                  type="button"
                  onClick={() => openDialog({ type: 'returnCheck', teamId: record.teamId })}
                >
                  <PackageCheck size={15} />
                  {t('handover.checkReturn')}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? <p className="empty-note">{t('handover.empty')}</p> : null}
      </section>
    </div>
  )
}
