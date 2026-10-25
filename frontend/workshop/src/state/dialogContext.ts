import { createContext, useContext } from 'react'
import type { NoticeKind, ObservationType } from '../data/activity'

/** Every dialog the portal can open; one is shown at a time, so a dialog can hand over to the next. */
export type DialogRequest =
  | { type: 'markAttendance'; mode: 'present' | 'absent' }
  | { type: 'repeatedAbsence' }
  | { type: 'notice'; audience?: string; kind?: NoticeKind }
  | { type: 'temporaryAbsence' }
  | { type: 'fullDayAbsence' }
  | { type: 'report'; teamId?: string; observationType?: ObservationType }
  | { type: 'returnCheck'; teamId: string }
  | { type: 'table'; code: string }
  | { type: 'logout' }

export type DialogContextValue = {
  openDialog: (request: DialogRequest) => void
  closeDialog: () => void
}

export const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialogs() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialogs must be used inside <DialogHost>.')
  return context
}
