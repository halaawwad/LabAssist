import { useState } from "react";
import type { ProjectIssue } from "../../../../shared/contracts/project-work";
import { useProjectWorkspace } from "@/lib/projectWorkspace";
import { Button } from "@/components/ui/button";

export function ProjectIssueEditor({ issue }: { issue: ProjectIssue }) {
  const [draft, setDraft] = useState<ProjectIssue>();
  const { saving, updateIssue } = useProjectWorkspace();
  return (
    <article className="space-y-2">
      <h3>{issue.title}</h3>
      <p>{issue.description}</p>
      <p>
        {issue.status.toLowerCase()} · {issue.priority.toLowerCase()} priority
      </p>
      {issue.resolution && <p>{issue.resolution}</p>}
      {!draft ? (
        <Button variant="secondary" onClick={() => setDraft(issue)}>
          Edit issue
        </Button>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await updateIssue(draft)) setDraft(undefined);
          }}
        >
          <label>
            Title{" "}
            <input
              required
              maxLength={240}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Description{" "}
            <textarea
              maxLength={10000}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label>
            Priority{" "}
            <select
              value={draft.priority}
              onChange={(event) =>
                setDraft({ ...draft, priority: event.target.value as ProjectIssue["priority"] })
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label>
            Status{" "}
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as ProjectIssue["status"] })
              }
            >
              <option value="OPEN">Open</option>
              <option value="MONITORING">Monitoring</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </label>
          {draft.status === "RESOLVED" && (
            <label>
              Resolution{" "}
              <textarea
                required
                maxLength={10000}
                value={draft.resolution}
                onChange={(event) => setDraft({ ...draft, resolution: event.target.value })}
              />
            </label>
          )}
          {draft.revision !== issue.revision && (
            <p role="alert">This issue changed. Reopen the editor to use the latest version.</p>
          )}
          <Button type="button" variant="secondary" onClick={() => setDraft(undefined)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              draft.revision !== issue.revision ||
              !draft.title.trim() ||
              (draft.status === "RESOLVED" && !draft.resolution.trim())
            }
          >
            Save issue
          </Button>
        </form>
      )}
    </article>
  );
}
