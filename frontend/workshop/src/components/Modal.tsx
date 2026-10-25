import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useI18n } from '../i18n/i18nContext'

type ModalProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

const focusableSelector = 'input, select, textarea, button:not(.modal-close), [href], [tabindex]:not([tabindex="-1"])'

/** Light glass dialog: Escape or a backdrop click closes it, and focus returns to the opener. */
export function Modal({ title, subtitle, icon, size = 'md', onClose, children, footer }: ModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const initialFocus = panel?.querySelector<HTMLElement>(focusableSelector) ?? panel
    initialFocus?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      // Keep Tab inside the dialog.
      const items = [...panel.querySelectorAll<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')].filter(
        (item) => !item.hasAttribute('disabled'),
      )
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('has-modal')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('has-modal')
      opener?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`modal-panel modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="modal-header">
          {icon ? <span className="modal-icon" aria-hidden="true">{icon}</span> : null}
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}
