import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  columns,
  initialMapping,
  readWorkbook,
  downloadTemplate,
  type Column,
  type Workbook,
} from "../departmentWorkbook";
import { planImport, type ImportReview } from "../departmentRecords";
import type { DepartmentAccount, DepartmentGroup } from "./DepartmentGroups";
import { DepartmentGroupCard } from "./DepartmentGroupCard";

export function DepartmentImport({
  accounts,
  groups,
  onConfirm,
}: {
  accounts: DepartmentAccount[];
  groups: DepartmentGroup[];
  onConfirm: (
    workbook: Workbook,
    mapping: Record<Column, number>,
    keepExisting: string[],
    transfers: boolean,
  ) => ImportReview;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [mapping, setMapping] = useState<Record<Column, number>>(() => initialMapping([]));
  const [adjustColumns, setAdjustColumns] = useState(false);
  const [keepExisting, setKeepExisting] = useState<string[]>([]);
  const [transfers, setTransfers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const review = useMemo(
    () =>
      workbook ? planImport(workbook, mapping, accounts, groups, keepExisting, transfers) : null,
    [workbook, mapping, accounts, groups, keepExisting, transfers],
  );
  const reasons = review
    ? [
        ...review.errors,
        ...review.rows.flatMap((r) => r.errors.map((e) => `Row ${r.number}: ${e}`)),
      ]
    : [];
  const blockingReason = busy
    ? "Reading your file…"
    : !workbook
      ? error || "Select an Excel file first."
      : reasons[0];
  const blocked = !!blockingReason;
  // Keep every parsed row visible, including invalid rows which cannot form a group yet.
  const previewGroups = new Map<string, NonNullable<typeof review>["rows"]>();
  for (const row of review?.rows ?? []) {
    const number = row.values[0] || "Missing project number";
    previewGroups.set(number, [...(previewGroups.get(number) ?? []), row]);
  }
  function close() {
    setOpen(false);
  }
  return (
    <>
      <div className="dept-toolbar dept-import-actions">
        <button
          className="dept-secondary"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >
          Import Excel
        </button>
        <button
          className="dept-secondary"
          onClick={() => {
            try {
              downloadTemplate();
            } catch {
              setError("Could not download the template. Try again.");
              setOpen(true);
            }
          }}
        >
          Download Excel template
        </button>
      </div>
      {open && (
        <div
          className="dept-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Import department Excel"
        >
          <section className="dept-dialog dept-import-dialog" aria-busy={busy}>
            <div className="dept-toolbar">
              <h2>Import Excel</h2>
              <button className="dept-icon-button" aria-label="Close import" onClick={close}>
                <X />
              </button>
            </div>
            <label>
              Choose Excel file
              <input
                type="file"
                accept=".xlsx"
                disabled={busy}
                onChange={async (e) => {
                  const nextFile = e.target.files?.[0];
                  if (!nextFile) return;
                  e.currentTarget.value = "";
                  const current = ++request.current;
                  setFile(nextFile);
                  setWorkbook(null);
                  setBusy(true);
                  setError("");
                  try {
                    const next = await readWorkbook(nextFile);
                    if (request.current !== current) return;
                    const detected = initialMapping(next.headers);
                    setWorkbook(next);
                    setMapping(detected);
                    setAdjustColumns(columns.some((c) => detected[c] < 0));
                    setKeepExisting([]);
                    setTransfers(false);
                  } catch (cause) {
                    if (request.current === current)
                      setError(cause instanceof Error ? cause.message : "Could not read workbook.");
                  } finally {
                    if (request.current === current) setBusy(false);
                  }
                }}
              />
            </label>
            {file && (
              <p className="dept-import-filename">
                {file.name}
                {workbook ? ` · ${workbook.rows.length} student rows` : ""}
              </p>
            )}
            {busy && <p role="status">Reading your file…</p>}
            {error && (
              <p className="dept-error" role="alert">
                {error}
              </p>
            )}
            {workbook && review && (
              <>
                <div>
                  <button
                    className="dept-secondary"
                    aria-expanded={adjustColumns}
                    aria-controls="department-import-columns"
                    onClick={() => setAdjustColumns(!adjustColumns)}
                  >
                    Adjust columns
                  </button>
                  {adjustColumns && (
                    <div id="department-import-columns" className="dept-import-mapping">
                      {columns.map((c) => (
                        <label key={c}>
                          {c}
                          <select
                            value={mapping[c]}
                            onChange={(e) => {
                              setMapping({ ...mapping, [c]: Number(e.target.value) });
                              setKeepExisting([]);
                              setTransfers(false);
                              setError("");
                            }}
                          >
                            <option value={-1}>Select column</option>
                            {Array.from({ length: workbook.headers.length }, (_, i) => (
                              <option key={i} value={i}>
                                {i + 1}: {workbook.headers[i] || "(blank header)"}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p role="status">
                  {review.summary.groupsCreated} new groups · {review.summary.groupsReused} existing
                  groups · {review.summary.accountsCreated} new accounts ·{" "}
                  {review.summary.accountsReused} reused accounts
                </p>
                <div className="dept-import-preview" aria-label="Project group preview">
                  {[...previewGroups].map(([number, rows]) => {
                    const people = (start: number) => [
                      ...new Map(
                        rows.map((row) => {
                          const values = row.values;
                          const saved = review.accounts.find(
                            (a) =>
                              a.number === values[start] &&
                              a.role === (start === 2 ? "Supervisor" : "Student"),
                          );
                          return [
                            JSON.stringify(values.slice(start, start + 3)),
                            {
                              ...saved,
                              name: values[start + 1] || "Missing name",
                              number: values[start] || "Missing number",
                              email: values[start + 2] || "Missing email",
                            },
                          ] as const;
                        }),
                      ).values(),
                    ];
                    return (
                      <DepartmentGroupCard
                        key={number}
                        number={number}
                        title={rows[0].values[1]}
                        supervisors={people(2)}
                        students={people(5)}
                        defaultExpanded
                      >
                        <p>Excel rows {rows.map((r) => r.number).join(", ")}</p>
                        {rows.some((r) => r.errors.length) && (
                          <ul className="dept-error">
                            {rows.flatMap((r) =>
                              r.errors.map((message, i) => (
                                <li key={`${r.number}-${i}`}>
                                  Row {r.number}: {message}
                                </li>
                              )),
                            )}
                          </ul>
                        )}
                        <details>
                          <summary>Rows and proposed changes</summary>
                          {rows.map((r, i) => (
                            <p key={i}>
                              Row {r.number}
                              {r.values[1] !== rows[0].values[1]
                                ? ` · Project name: ${r.values[1] || "Not set"}`
                                : ""}
                              : {r.actions.join("; ") || "Complete the required fields."}
                            </p>
                          ))}
                        </details>
                      </DepartmentGroupCard>
                    );
                  })}
                </div>
                {review.detailConflicts.map((c) => (
                  <label className="dept-pick" key={c.key}>
                    <input
                      type="checkbox"
                      checked={keepExisting.includes(c.key)}
                      onChange={(e) =>
                        setKeepExisting(
                          e.target.checked
                            ? [...keepExisting, c.key]
                            : keepExisting.filter((k) => k !== c.key),
                        )
                      }
                    />
                    <span>{c.description} Keep saved details.</span>
                  </label>
                ))}
                {review.transfers.length > 0 && (
                  <div>
                    <ul>
                      {review.transfers.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <label className="dept-pick">
                      <input
                        type="checkbox"
                        checked={transfers}
                        onChange={(e) => setTransfers(e.target.checked)}
                      />
                      Confirm these student transfers.
                    </label>
                  </div>
                )}
                {!!review.errors.length && (
                  <ul className="dept-error" role="alert">
                    {review.errors.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <div className="dept-import-footer">
              <button
                className="dept-primary"
                disabled={blocked}
                aria-describedby={blocked ? "department-import-blocker" : undefined}
                onClick={() => {
                  if (!workbook || blocked) return;
                  setError("");
                  try {
                    const applied = onConfirm(workbook, mapping, keepExisting, transfers);
                    const failures = [
                      ...applied.errors,
                      ...applied.rows.flatMap((r) =>
                        r.errors.map((message) => `Row ${r.number}: ${message}`),
                      ),
                    ];
                    if (failures.length) {
                      setError(failures.join(" "));
                      return;
                    }
                    close();
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Could not save. Your preview is preserved; try again.",
                    );
                  }
                }}
              >
                Add groups
              </button>
              {blocked && (
                <p id="department-import-blocker" role="status" className="dept-import-blocker">
                  {blockingReason}
                  {reasons.length > 1 ? ` (${reasons.length} issues to resolve)` : ""}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
