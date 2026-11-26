import { useProjectWorkspace } from "@/lib/projectWorkspace";
import { Button } from "@/components/ui/button";

export function ProjectWorkspaceStatus() {
  const { loading, error, reload, project, saving } = useProjectWorkspace();
  if (loading) return <p role="status">Loading project…</p>;
  if (!error)
    return project ? (
      <Button variant="secondary" disabled={saving} onClick={() => void reload()}>
        Refresh project
      </Button>
    ) : null;

  const message = {
    missing: "You have no project assigned for the current term.",
    load: "Could not load your project.",
    save: "Could not save this change. Your input is still available.",
    conflict: "A teammate updated this item. Reload the project before retrying.",
  }[error];

  return (
    <div className="insight-paper">
      <p role="alert">{message}</p>
      <Button variant="secondary" disabled={saving} onClick={() => void reload()}>
        Reload project
      </Button>
    </div>
  );
}
