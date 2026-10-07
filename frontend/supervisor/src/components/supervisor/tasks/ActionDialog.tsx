import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { progressProjects } from '../../../data/supervisor/progressMockData'

type ActionDialogProps = {
  title: string
  description: string
  icon: LucideIcon
  onClose: () => void
  children: ReactNode
  /** When set, the body is a form and the footer shows a submit button with this label. */
  submitLabel?: string
  onSubmit?: (data: FormData) => void
}

/** Modal window used by the Quick Actions. Closes with Esc, the X button or a click outside. */
export function ActionDialog({ title, description, icon: Icon, onClose, children, submitLabel, onSubmit }: ActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(new FormData(event.currentTarget))
  }

  const content = (
    <>
      <header className="action-dialog-header">
        <span className="action-dialog-icon" aria-hidden="true">
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="action-dialog-close" type="button" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </header>

      <div className="action-dialog-body">{children}</div>

      <footer className="action-dialog-footer">
        <button className="dialog-secondary-button" type="button" onClick={onClose}>
          {onSubmit ? 'Cancel' : 'Close'}
        </button>
        {onSubmit ? (
          <button className="dialog-primary-button" type="submit">
            {submitLabel}
          </button>
        ) : null}
      </footer>
    </>
  )

  return (
    <dialog
      className="action-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {onSubmit ? <form onSubmit={handleSubmit}>{content}</form> : <div>{content}</div>}
    </dialog>
  )
}

type ProjectSelectProps = {
  value?: string
  onChange?: (code: string) => void
}

/** Supervised project picker shared by the Quick Action forms. */
export function ProjectSelect({ value, onChange }: ProjectSelectProps) {
  return (
    <label className="dialog-field">
      <span>Project</span>
      <select
        name="project"
        required
        value={value}
        defaultValue={value === undefined ? '' : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        <option value="" disabled>
          Select a project
        </option>
        {progressProjects.map((project) => (
          <option value={project.code} key={project.code}>
            {project.code} · {project.name}
          </option>
        ))}
      </select>
    </label>
  )
}
