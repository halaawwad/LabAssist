import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Search, Settings, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/i18nContext'
import { useDialogs } from '../state/dialogContext'

type PageHeaderProps = {
  title: string
  subtitle: string
  /** Controlled search; the box is hidden on pages that have nothing to search. */
  search?: { value: string; onChange: (value: string) => void }
}

/** Title over the warm workshop scene, with search and the account menu on the right. */
export function PageHeader({ title, subtitle, search }: PageHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="page-header">
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-tools">
        {search ? (
          <label className="search-box">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={t('header.search')}
              aria-label={t('header.searchLabel')}
            />
            {search.value ? (
              <button type="button" onClick={() => search.onChange('')} aria-label={t('header.clearSearch')}>
                <X size={16} />
              </button>
            ) : null}
          </label>
        ) : null}
        <AccountMenu />
      </div>
    </header>
  )
}

function AccountMenu() {
  const { t } = useI18n()
  const { openDialog } = useDialogs()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-chip"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('header.menu')}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">
          {t('header.initials')}
        </span>
        <span className="account-name">{t('header.name')}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="account-dropdown" role="menu">
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)}>
            <Settings size={17} />
            {t('nav.settings')}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false)
              openDialog({ type: 'logout' })
            }}
          >
            <LogOut size={17} />
            {t('nav.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
