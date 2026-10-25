import { LogOut } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'
import { useWorkshop } from '../../state/workshopContext'
import { Modal } from '../Modal'

export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { setSignedOut } = useWorkshop()

  return (
    <Modal
      title={t('logout.title')}
      subtitle={t('logout.body')}
      icon={<LogOut size={20} />}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              onClose()
              setSignedOut(true)
            }}
          >
            <LogOut size={16} />
            {t('logout.confirm')}
          </button>
        </>
      }
    >
      {null}
    </Modal>
  )
}
