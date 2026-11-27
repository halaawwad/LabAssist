import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useFinanceEditor } from "../../../../shared/project-work/useFinanceEditor";
import {
  useProjectFinance,
  type FinanceClient,
} from "../../../../shared/project-work/useProjectFinance";
import type { SessionClient } from "../../../../shared/auth/session-client";
import type { ProjectFinance } from "../../../../shared/contracts/project-finance";
const data: ProjectFinance = {
  projectId: "p",
  readOnly: false,
  budget: {
    currency: "ILS",
    amount: "100.00",
    spent: "0.00",
    remaining: "100.00",
    estimatedKnown: "0.00",
    unpricedItems: 0,
    revision: 2,
  },
  bom: [],
  expenses: [],
};
const fake = (save = vi.fn(async () => true)): FinanceClient => ({
  data,
  error: null,
  loading: false,
  saving: false,
  reload: vi.fn(async () => data),
  uploadReceipt: vi.fn(async () => ({ id: "receipt-id", name: "receipt.pdf" })),
  save,
});
describe("shared project finance drafts", () => {
  it("preserves an uncertain purchase and reuses its idempotency key on retry", async () => {
    const save = vi.fn(async () => false),
      finance = fake(save);
    const { result } = renderHook(() => useFinanceEditor(finance));
    act(() =>
      result.current.setExpense({
        ...result.current.expense,
        label: "Sensor",
        quantity: "2",
        unitPrice: "9.50",
      }),
    );
    await act(async () => {
      await result.current.saveExpense();
    });
    await act(async () => {
      await result.current.saveExpense();
    });
    const first = save.mock.calls[0] as unknown as [string, string, { requestKey: string }];
    const second = save.mock.calls[1] as unknown as [string, string, { requestKey: string }];
    expect(first[2].requestKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(second[2].requestKey).toBe(first[2].requestKey);
    expect(result.current.expense.label).toBe("Sensor");
    expect(result.current.notice).toBe("");
  });
  it("clears a confirmed purchase and gives the next purchase a new key", async () => {
    const save = vi.fn(async () => true);
    const { result } = renderHook(() => useFinanceEditor(fake(save)));
    act(() =>
      result.current.setExpense({ ...result.current.expense, label: "Sensor", unitPrice: "1.00" }),
    );
    await act(async () => {
      await result.current.saveExpense();
    });
    expect(result.current.expense.label).toBe("");
    act(() =>
      result.current.setExpense({ ...result.current.expense, label: "Second", unitPrice: "1.00" }),
    );
    await act(async () => {
      await result.current.saveExpense();
    });
    const calls = save.mock.calls as unknown as [string, string, { requestKey: string }][];
    expect(calls[1]![2].requestKey).not.toBe(calls[0]![2].requestKey);
  });
  it("keeps unknown estimates null and zero estimates as a real price", async () => {
    const save = vi.fn(async () => true);
    const { result } = renderHook(() => useFinanceEditor(fake(save)));
    act(() =>
      result.current.setBom({ ...result.current.bom, name: "Enclosure", estimatedUnitPrice: "" }),
    );
    await act(async () => {
      await result.current.saveBom();
    });
    act(() =>
      result.current.setBom({
        ...result.current.bom,
        name: "Reused part",
        estimatedUnitPrice: "0.00",
      }),
    );
    await act(async () => {
      await result.current.saveBom();
    });
    const calls = save.mock.calls as unknown as [
      string,
      string,
      { estimatedUnitPrice: string | null },
    ][];
    expect(calls[0]![2].estimatedUnitPrice).toBeNull();
    expect(calls[1]![2].estimatedUnitPrice).toBe("0.00");
  });
  it("captures budget revision and explicitly reloads the latest budget before retrying", async () => {
    const finance = fake(vi.fn(async () => false));
    finance.reload = vi.fn(async () => ({
      ...data,
      budget: { ...data.budget!, amount: "200.00", revision: 4 },
    }));
    const { result } = renderHook(() => useFinanceEditor(finance));
    await act(async () => {
      await result.current.saveBudget();
    });
    expect(result.current.budget.expectedRevision).toBe(2);
    await act(async () => {
      await result.current.latestBudget();
    });
    expect(result.current.budget).toMatchObject({ amount: "200.00", expectedRevision: 4 });
  });
  it("does not expose a previous project when an older request completes late", async () => {
    let finish: (value: ProjectFinance) => void = () => {};
    const client = {
      authorizedRequest: vi.fn((path: string) =>
        path.includes("/first/")
          ? new Promise<ProjectFinance>((r) => {
              finish = r;
            })
          : Promise.resolve({ ...data, projectId: "second" }),
      ),
    } as unknown as SessionClient;
    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectFinance(client, "student", projectId),
      { initialProps: { projectId: "first" } },
    );
    rerender({ projectId: "second" });
    await waitFor(() => expect(result.current.data?.projectId).toBe("second"));
    await act(async () => {
      finish({ ...data, projectId: "first" });
    });
    expect(result.current.data?.projectId).toBe("second");
  });
});

it("keeps a successfully uploaded receipt attached through a failed purchase retry", async () => {
  const save = vi.fn(async () => false),
    finance = fake(save);
  const { result } = renderHook(() => useFinanceEditor(finance));
  await act(async () => {
    await result.current.attachReceipt("receipt.pdf", "JVBERg==");
  });
  expect(result.current.expense.receiptFileId).toBe("receipt-id");
  act(() =>
    result.current.setExpense({
      ...result.current.expense,
      label: "Receipt purchase",
      quantity: "1",
      unitPrice: "2.00",
    }),
  );
  await act(async () => {
    await result.current.saveExpense();
  });
  expect(
    (save.mock.calls[0] as unknown as [string, string, { receiptFileId: string }])[2].receiptFileId,
  ).toBe("receipt-id");
  expect(result.current.expense.receiptFileId).toBe("receipt-id");
});
