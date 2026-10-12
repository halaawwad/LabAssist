import { useState, type ChangeEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import type { SupervisorProfile } from '../../../data/supervisor/profileMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { ProfileAvatar } from './ProfileAvatar'
import { resizeProfilePhoto } from './profilePhoto'

type AccountFieldsProps = {
  draft: SupervisorProfile
  onChange: (changes: Partial<SupervisorProfile>) => void
}

/** Photo, name, email and specialization inputs. The parent form owns submit and cancel. */
export function AccountFields({ draft, onChange }: AccountFieldsProps) {
  const { t } = useI18n()
  const [photoError, setPhotoError] = useState(false)

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again still fires a change.
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError(true)
      return
    }
    try {
      onChange({ photo: await resizeProfilePhoto(file) })
      setPhotoError(false)
    } catch {
      setPhotoError(true)
    }
  }

  return (
    <>
      <div className="dialog-field">
        <span>{t('account.photo')}</span>
        <div className="account-photo-field">
          <ProfileAvatar name={draft.name} photo={draft.photo} size="medium" />
          <div className="account-photo-actions">
            <div>
              <label className="dialog-secondary-button account-photo-upload">
                <Camera size={16} aria-hidden="true" />
                {draft.photo ? t('account.changePhoto') : t('account.uploadPhoto')}
                <input className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} />
              </label>
              {draft.photo ? (
                <button className="account-photo-remove" type="button" onClick={() => onChange({ photo: null })}>
                  <Trash2 size={16} aria-hidden="true" />
                  {t('account.removePhoto')}
                </button>
              ) : null}
            </div>
            <small className={photoError ? 'is-error' : undefined} role={photoError ? 'alert' : undefined}>
              {photoError ? t('account.invalidPhoto') : t('account.photoHint')}
            </small>
          </div>
        </div>
      </div>

      <label className="dialog-field">
        <span>{t('account.name')}</span>
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          autoComplete="name"
          placeholder={t('account.namePlaceholder')}
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>

      <label className="dialog-field">
        <span>{t('account.email')}</span>
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          value={draft.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </label>

      <label className="dialog-field">
        <span>{t('account.specialization')}</span>
        <input
          name="specialization"
          type="text"
          required
          maxLength={80}
          placeholder={t('account.specializationPlaceholder')}
          value={draft.specialization}
          onChange={(event) => onChange({ specialization: event.target.value })}
        />
      </label>
    </>
  )
}
