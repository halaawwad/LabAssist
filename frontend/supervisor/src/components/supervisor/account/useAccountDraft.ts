import { useState } from 'react'
import type { SupervisorProfile } from '../../../data/supervisor/profileMockData'
import { useAccount } from '../../../state/supervisor/accountContext'

/** Editable copy of the profile, shared by the Profile edit dialog and the Settings account form. */
export function useAccountDraft() {
  const { profile, updateProfile } = useAccount()
  const [draft, setDraft] = useState<SupervisorProfile>(profile)

  const isDirty =
    draft.name !== profile.name ||
    draft.email !== profile.email ||
    draft.specialization !== profile.specialization ||
    draft.photo !== profile.photo

  const change = (changes: Partial<SupervisorProfile>) => setDraft((current) => ({ ...current, ...changes }))

  const save = () => {
    const next = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      specialization: draft.specialization.trim(),
    }
    updateProfile(next)
    setDraft(next)
  }

  return { draft, change, save, reset: () => setDraft(profile), isDirty }
}
