type SupervisorNotePanelProps = {
  note: string
}

export function SupervisorNotePanel({ note }: SupervisorNotePanelProps) {
  return (
    <section className="progress-side-panel progress-note-panel glass-panel" aria-labelledby="supervisor-note-title">
      <h2 id="supervisor-note-title">Your note</h2>
      <p>{note}</p>
      <button className="progress-note-edit" type="button">
        Edit
      </button>
    </section>
  )
}
