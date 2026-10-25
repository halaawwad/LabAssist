import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DialogContext, type DialogRequest } from '../state/dialogContext'
import { AbsenceDialog } from './dialogs/AbsenceDialog'
import { AttendanceDialog } from './dialogs/AttendanceDialog'
import { LogoutDialog } from './dialogs/LogoutDialog'
import { NoticeDialog } from './dialogs/NoticeDialog'
import { RepeatedAbsenceDialog } from './dialogs/RepeatedAbsenceDialog'
import { ReportDialog } from './dialogs/ReportDialog'
import { ReturnCheckDialog } from './dialogs/ReturnCheckDialog'
import { TableDetailsDialog } from './dialogs/TableDetailsDialog'

/** Owns the single open dialog, so any page or dialog can open the next one (e.g. table → report). */
export function DialogHost({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null)
  const closeDialog = useCallback(() => setRequest(null), [])
  const value = useMemo(() => ({ openDialog: setRequest, closeDialog }), [closeDialog])

  return (
    <DialogContext.Provider value={value}>
      {children}
      {request ? <ActiveDialog key={JSON.stringify(request)} request={request} onClose={closeDialog} /> : null}
    </DialogContext.Provider>
  )
}

function ActiveDialog({ request, onClose }: { request: DialogRequest; onClose: () => void }) {
  switch (request.type) {
    case 'markAttendance':
      return <AttendanceDialog mode={request.mode} onClose={onClose} />
    case 'repeatedAbsence':
      return <RepeatedAbsenceDialog onClose={onClose} />
    case 'notice':
      return <NoticeDialog audience={request.audience} kind={request.kind} onClose={onClose} />
    case 'temporaryAbsence':
      return <AbsenceDialog fullDay={false} onClose={onClose} />
    case 'fullDayAbsence':
      return <AbsenceDialog fullDay onClose={onClose} />
    case 'report':
      return <ReportDialog teamId={request.teamId} observationType={request.observationType} onClose={onClose} />
    case 'returnCheck':
      return <ReturnCheckDialog teamId={request.teamId} onClose={onClose} />
    case 'table':
      return <TableDetailsDialog code={request.code} onClose={onClose} />
    case 'logout':
      return <LogoutDialog onClose={onClose} />
  }
}
