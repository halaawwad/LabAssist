import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { progressProjects } from '../../../data/supervisor/progressMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { interactionLabels } from '../interactionLabels'

type ActionDialogProps = {
  title: string
  description: string
  icon: LucideIcon
  onClose: () => void
  children?: ReactNode
  /** When set, the body is a form and the footer shows a submit button with this label. */
  submitLabel?: string
  onSubmit?: (data: FormData) => void
}

/** Modal window used by the Quick Actions. Closes with Esc, the X button or a click outside. */
export function ActionDialog({
  title,
  description,
  icon: Icon,
  onClose,
  children,
  submitLabel,
  onSubmit,
}: ActionDialogProps) {
  const { t, language } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = event.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[required], textarea[required]',
    )
    for (const field of fields) {
      if (['text', 'search', 'textarea'].includes(field.type) && !field.value.trim()) {
        field.setCustomValidity(interactionLabels[language].required)
        field.reportValidity()
        return
      }
    }
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
        <button
          className="action-dialog-close"
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      {children ? <div className="action-dialog-body">{children}</div> : null}

      <footer className="action-dialog-footer">
        <button className="dialog-secondary-button" type="button" onClick={onClose}>
          {onSubmit ? t('common.cancel') : t('common.close')}
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
      {onSubmit ? (
        <form
          onSubmit={handleSubmit}
          onInput={(event) => {
            const field = event.target
            if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
              field.setCustomValidity('')
          }}
        >
          {content}
        </form>
      ) : (
        <div>{content}</div>
      )}
    </dialog>
  )
}

type ProjectSelectProps = {
  value?: string
  defaultValue?: string
  onChange?: (code: string) => void
}

/** Supervised project picker shared by the Quick Action forms. */
export function ProjectSelect({ value, defaultValue, onChange }: ProjectSelectProps) {
  const { t } = useI18n()

  return (
    <label className="dialog-field">
      <span>{t('tasks.dialogs.project')}</span>
      <select
        name="project"
        required
        value={value}
        defaultValue={value === undefined ? (defaultValue ?? '') : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      >
        <option value="" disabled>
          {t('tasks.dialogs.selectProject')}
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
