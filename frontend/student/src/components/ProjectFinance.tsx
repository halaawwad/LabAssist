import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useProjectWorkspace } from "@/lib/projectWorkspace";
import { useFinanceEditor } from "../../../../shared/project-work/useFinanceEditor";
import type { FinanceClient } from "../../../../shared/project-work/useProjectFinance";
import { Button } from "@/components/ui/button";
import { ProjectMetricArt } from "@/components/ProjectMetricArt";
function Input({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input
        className="w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-foreground"
        disabled={disabled}
        aria-label={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function LiveFinanceSummary({ onManage }: { onManage?: () => void }) {
  const { finance } = useProjectWorkspace();
  const b = finance.data?.budget;
  return (
    <section className="insight-paper project-budget-analysis">
      <h2>Budget health</h2>
      {b ? (
        <>
          <div className="budget-orbit">
            <ProjectMetricArt
              value={Math.min(
                100,
                Math.max(
                  0,
                  Number(b.amount) > 0
                    ? (Number(b.spent) / Number(b.amount)) * 100
                    : Number(b.spent) > 0
                      ? 100
                      : 0,
                ),
              )}
              tone="budget"
              label="Resource tracker"
              detail={`of ${b.currency} ${b.amount} budget used`}
            />
            <div>
              <strong>
                {b.currency} {b.remaining}
              </strong>
              <span> still available</span>
            </div>
          </div>
          <p>
            Spent {b.currency} {b.spent} · Budget {b.currency} {b.amount}
          </p>
        </>
      ) : (
        <p>
          {finance.loading
            ? "Loading budget…"
            : finance.error
              ? "Could not load budget."
              : "Set the project budget and currency first."}
        </p>
      )}
      {onManage && (
        <Button variant="secondary" onClick={onManage}>
          Manage budget & parts
        </Button>
      )}
    </section>
  );
}
export function LiveProjectFinance() {
  const { finance } = useProjectWorkspace();
  if (!finance.data)
    return (
      <section className="insight-paper">
        <p role="alert">
          {finance.loading ? "Loading project finances…" : "Could not load project finances."}
        </p>
        <Button onClick={() => void finance.reload()}>Retry finances</Button>
      </section>
    );
  return <FinanceForms key={finance.data.projectId} finance={finance} />;
}
function FinanceForms({ finance }: { finance: FinanceClient }) {
  const [receiptError, setReceiptError] = useState("");
  const f = useFinanceEditor(finance),
    d = finance.data!;
  const notices: Record<string, string> = {
    budgetSaved: "Budget saved.",
    bomSaved: "Part saved.",
    expenseSaved: "Purchase recorded.",
    expenseVoided: "Expense voided; history preserved.",
  };
  return (
    <div className="grid gap-6">
      {finance.error && (
        <section className="insight-paper">
          <p role="alert">
            {finance.error === "conflict"
              ? "This item changed. Reload before retrying."
              : "Could not save or reload. Your input is preserved."}
          </p>
          <Button onClick={() => void f.latestBudget()}>Reload finances</Button>
        </section>
      )}
      {f.notice && <p role="status">{notices[f.notice]}</p>}
      {d.readOnly && <p>This project is read-only.</p>}
      <div className="components-workspace-grid">
        <LiveFinanceSummary />
        <section className="insight-paper grid gap-4">
          <h2>Project budget</h2>
          <Input
            disabled={f.disabled}
            label="Budget amount"
            value={f.budget.amount}
            onChange={(amount) => f.setBudget({ ...f.budget, amount })}
          />
          {d.budget ? (
            <p>Currency: {d.budget.currency}</p>
          ) : (
            <label>
              Currency
              <select
                aria-label="Currency"
                className="m-2 rounded-xl border border-border p-2"
                value={f.budget.currency}
                onChange={(e) => f.setBudget({ ...f.budget, currency: e.target.value })}
              >
                {["ILS", "USD", "JOD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <Button onClick={() => void f.saveBudget()} disabled={!f.canBudget}>
            Save budget
          </Button>
        </section>
      </div>
      <section className="insight-paper">
        <h2>Build readiness</h2>
        <p>
          {d.bom
            .filter((p) => p.isNeeded)
            .reduce((n, p) => n + Math.min(p.quantityRequired, p.acquiredQuantity), 0)}{" "}
          / {d.bom.filter((p) => p.isNeeded).reduce((n, p) => n + p.quantityRequired, 0)} units
          purchased
        </p>
        <p>
          Known estimated cost: {d.budget?.currency} {d.budget?.estimatedKnown ?? "0.00"} ·{" "}
          {d.budget?.unpricedItems ?? 0} parts without an estimate
        </p>
      </section>
      <Button asChild variant="secondary">
        <Link to="/catalog">Explore component catalog</Link>
      </Button>
      <section className="insight-paper">
        <h2>Bill of Materials</h2>
        {!d.bom.length && <p>No parts added yet.</p>}
        <div className="grid gap-4">
          {d.bom.map((part) => (
            <article key={part.id} className="rounded-2xl border border-border p-4">
              <h3>{part.name}</h3>
              <p>
                Required {part.quantityRequired} · Purchased {part.acquiredQuantity} · Missing{" "}
                {part.missingQuantity}
              </p>
              <p>
                {part.isNeeded ? "Needed" : "Not needed"} · {d.budget?.currency}{" "}
                {part.estimatedUnitPrice ?? "Not priced"}
              </p>
              {part.notNeededReason && <p>{part.notNeededReason}</p>}
              <Button
                variant="secondary"
                disabled={f.disabled}
                onClick={() => {
                  f.editBom(part);
                  document
                    .getElementById("finance-part-editor")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Edit part
              </Button>
            </article>
          ))}
        </div>
      </section>
      <section id="finance-part-editor" className="insight-paper grid gap-4">
        <h2>{f.bom.id ? "Edit part" : "Add part"}</h2>
        {!d.budget && <p>Save a budget before adding parts.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            disabled={f.disabled}
            label="Part name"
            value={f.bom.name}
            onChange={(name) => f.setBom({ ...f.bom, name })}
          />
          <Input
            disabled={f.disabled}
            label="Required quantity"
            value={f.bom.quantityRequired}
            onChange={(quantityRequired) => f.setBom({ ...f.bom, quantityRequired })}
          />
          <Input
            disabled={f.disabled}
            label="Estimated unit price (optional)"
            value={f.bom.estimatedUnitPrice}
            onChange={(estimatedUnitPrice) => f.setBom({ ...f.bom, estimatedUnitPrice })}
          />
          <Input
            disabled={f.disabled}
            label="Notes"
            value={f.bom.notes}
            onChange={(notes) => f.setBom({ ...f.bom, notes })}
          />
        </div>
        {f.bom.id && (
          <>
            <label>
              <input
                type="checkbox"
                checked={f.bom.isNeeded}
                onChange={(e) => f.setBom({ ...f.bom, isNeeded: e.target.checked })}
              />{" "}
              Still needed
            </label>
            {!f.bom.isNeeded && (
              <Input
                disabled={f.disabled}
                label="Reason"
                value={f.bom.notNeededReason}
                onChange={(notNeededReason) => f.setBom({ ...f.bom, notNeededReason })}
              />
            )}
            <Button variant="ghost" disabled={f.disabled} onClick={f.cancelBom}>
              Cancel edit
            </Button>
          </>
        )}
        <Button disabled={!f.canBom} onClick={() => void f.saveBom()}>
          Save part
        </Button>
      </section>
      <section className="insight-paper grid gap-4">
        <h2>Record purchase</h2>
        <label>
          Purchased part
          <select
            aria-label="Purchased part"
            className="m-2 max-w-full rounded-xl border border-border p-2"
            value={f.expense.bomItemId}
            onChange={(e) => f.choosePart(e.target.value)}
          >
            <option value="">Other expense</option>
            {d.bom
              .filter((p) => p.isNeeded)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            disabled={f.disabled}
            label="Purchase description"
            value={f.expense.label}
            onChange={(label) => f.setExpense({ ...f.expense, label })}
          />
          <Input
            disabled={f.disabled}
            label="Purchase quantity"
            value={f.expense.quantity}
            onChange={(quantity) => f.setExpense({ ...f.expense, quantity })}
          />
          <Input
            disabled={f.disabled}
            label="Actual unit price"
            value={f.expense.unitPrice}
            onChange={(unitPrice) => f.setExpense({ ...f.expense, unitPrice })}
          />
          <Input
            disabled={f.disabled}
            label="Purchase date"
            type="date"
            value={f.expense.purchasedOn}
            onChange={(purchasedOn) => f.setExpense({ ...f.expense, purchasedOn })}
          />
          <Input
            disabled={f.disabled}
            label="Seller (optional)"
            value={f.expense.sellerName}
            onChange={(sellerName) => f.setExpense({ ...f.expense, sellerName })}
          />
        </div>
        <label className="grid gap-2">
          Receipt (optional, PDF/PNG/JPEG, max 1 MiB)
          <input
            aria-label="Receipt file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            disabled={f.disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              setReceiptError("");
              if (!file) return;
              if (file.size > 1048576) {
                setReceiptError("Choose a receipt up to 1 MiB.");
                return;
              }
              const reader = new FileReader();
              reader.onerror = () => setReceiptError("Could not read receipt.");
              reader.onload = () =>
                void f.attachReceipt(file.name, String(reader.result).split(",")[1] ?? "");
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {f.expense.receiptName && <p>{f.expense.receiptName}</p>}
        {receiptError && <p role="alert">{receiptError}</p>}
        <Button disabled={!f.canExpense} onClick={() => void f.saveExpense()}>
          Save purchase
        </Button>
        <Button variant="ghost" disabled={f.disabled} onClick={f.startNewExpense}>
          Clear purchase form
        </Button>
      </section>
      <section className="insight-paper grid gap-4">
        <h2>Expense history</h2>
        {!d.expenses.length && <p>No purchases recorded.</p>}
        {d.expenses.map((e) => (
          <article key={e.id} className="rounded-2xl border border-border p-4">
            <h3>{e.lines.map((l) => l.label).join(", ")}</h3>
            <p>
              {d.budget?.currency} {e.amount} · {e.purchasedOn} ·{" "}
              {e.status === "VOIDED" ? "Voided" : "Recorded"}
            </p>
            {e.receiptFileId && <p>Receipt attached</p>}
            {e.voidReason && <p>{e.voidReason}</p>}
            {e.status === "POSTED" && (
              <Button variant="secondary" disabled={f.disabled} onClick={() => f.prepareVoid(e)}>
                Void expense
              </Button>
            )}
          </article>
        ))}
        {f.voidDraft && (
          <>
            <Input
              disabled={f.disabled}
              label="Cancellation reason"
              value={f.voidDraft.reason}
              onChange={(reason) => f.setVoidDraft(f.voidDraft ? { ...f.voidDraft, reason } : null)}
            />
            <Button
              variant="destructive"
              disabled={f.disabled || !f.voidDraft.reason.trim()}
              onClick={() => void f.saveVoid()}
            >
              Confirm cancellation
            </Button>
            <Button variant="ghost" onClick={() => f.setVoidDraft(null)}>
              Keep expense
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
