import { BookOpen } from 'lucide-react'
import type { FinalReportProject, ReportBlock, ReportPage } from '../../../data/supervisor/finalReportsMockData'

type ReportSheetProps = {
  project: FinalReportProject
  page: ReportPage
  supervisor: string
  query: string
}

/** One page of the submitted report PDF (read only), laid out like the An-Najah template. */
export function ReportSheet({ project, page, supervisor, query }: ReportSheetProps) {
  return (
    <article className="fr-sheet" dir="ltr" lang="en">
      <header className="fr-sheet-header" aria-hidden="true">
        <span className="fr-sheet-seal">
          <BookOpen strokeWidth={1.6} />
        </span>
        <span className="fr-sheet-university">
          <span className="fr-sheet-arabic" lang="ar">
            جامعة النجاح الوطنية
          </span>
          <strong>An-Najah National University</strong>
          <small>Faculty of Engineering and Information Technology</small>
        </span>
      </header>

      {page.section === 'cover' ? (
        <div className="fr-sheet-cover">
          <h2>
            <Highlight text={project.name} query={query} />
          </h2>
          <p className="fr-sheet-cover-kind">Graduation Project Report</p>
          <dl>
            <dt>Prepared by:</dt>
            {project.students.map((student) => (
              <dd key={student.id}>
                <Highlight text={`${student.name} ${student.id}`} query={query} />
              </dd>
            ))}
            <dt>Supervisor:</dt>
            <dd>{supervisor}</dd>
          </dl>
          <p className="fr-sheet-cover-year">{project.year}</p>
        </div>
      ) : (
        <div className="fr-sheet-body">
          {page.title ? (
            <h2 className="fr-sheet-title">
              <Highlight text={page.title} query={query} />
            </h2>
          ) : null}
          {page.blocks.map((block) => (
            <ReportBlockView key={block.id} block={block} query={query} />
          ))}
        </div>
      )}

      <footer className="fr-sheet-footer">
        {page.number ? <span className="fr-sheet-number">{page.number}</span> : null}
        <span className="fr-sheet-address" aria-hidden="true">
          <b>University</b> Nablus, Palestine · www.najah.edu
        </span>
      </footer>
    </article>
  )
}

function ReportBlockView({ block, query }: { block: ReportBlock; query: string }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h3 className="fr-sheet-heading">
          <Highlight text={block.text} query={query} />
        </h3>
      )
    case 'paragraph':
      return (
        <p>
          <Highlight text={block.text} query={query} />
        </p>
      )
    case 'list': {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <Highlight text={item} query={query} />
        </li>
      ))
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>
    }
    case 'table':
      return (
        <figure className="fr-sheet-table">
          <table>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <Highlight text={cell} query={query} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <figcaption>{block.caption}</figcaption>
        </figure>
      )
    case 'figure':
      return (
        <figure className="fr-sheet-figure">
          <img src={block.image} alt="" />
          <figcaption>
            <Highlight text={block.caption} query={query} />
          </figcaption>
        </figure>
      )
    case 'entries':
      return (
        <ol className="fr-sheet-entries">
          {block.entries.map((entry, index) => (
            <li className={entry.level === 1 ? 'is-chapter' : undefined} key={index}>
              <span>
                <Highlight text={entry.label} query={query} />
              </span>
              <i aria-hidden="true" />
              <span>{entry.page}</span>
            </li>
          ))}
        </ol>
      )
    case 'definitions':
      return (
        <dl className="fr-sheet-definitions">
          {block.entries.map(([term, meaning]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>
                <Highlight text={meaning} query={query} />
              </dd>
            </div>
          ))}
        </dl>
      )
  }
}

/** Marks every case-insensitive occurrence of the search query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return <>{text}</>
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : part))}
    </>
  )
}
