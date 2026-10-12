import { useI18n } from '../../../i18n/i18nContext'
import { profileInitial } from '../../../state/supervisor/accountContext'

type ProfileAvatarProps = {
  name: string
  photo: string | null
  size: 'medium' | 'large'
}

/** Larger version of the top-bar avatar: the profile photo, or the name's initial on the same warm gradient. */
export function ProfileAvatar({ name, photo, size }: ProfileAvatarProps) {
  const { t } = useI18n()

  return (
    <span className={`avatar profile-avatar is-${size}`}>
      {photo ? <img src={photo} alt={t('profile.photoAlt', { name })} /> : <span aria-hidden="true">{profileInitial(name)}</span>}
    </span>
  )
}
