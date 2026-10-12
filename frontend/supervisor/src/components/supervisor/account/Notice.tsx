import { CircleCheck } from 'lucide-react'

/** Toast at the bottom of the page; empty when there is nothing to say (kept mounted for screen readers). */
export function Notice({ message }: { message: string }) {
  return (
    <p className="tasks-notice" role="status">
      {message ? (
        <>
          <CircleCheck size={18} aria-hidden="true" />
          {message}
        </>
      ) : null}
    </p>
  )
}
