import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type PanelProps = {
  icon: LucideIcon
  title: string
  titleId: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Soft glass section with an icon title row; the shared frame for every dashboard area. */
export function Panel({ icon: Icon, title, titleId, action, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`} aria-labelledby={titleId}>
      <header className="panel-header">
        <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
        <h2 id={titleId}>{title}</h2>
        {action ? <div className="panel-action">{action}</div> : null}
      </header>
      {children}
    </section>
  )
}
