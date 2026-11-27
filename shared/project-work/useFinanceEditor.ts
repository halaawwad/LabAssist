import { useRef, useState } from "react";
import { newExpenseKey, validMoney, type FinanceClient } from "./useProjectFinance";
import type { FinanceBom, FinanceExpense } from "../contracts/project-finance";
const emptyBom = () => ({
  id: "",
  expectedRevision: 0,
  name: "",
  quantityRequired: "1",
  estimatedUnitPrice: "",
  notes: "",
  isNeeded: true,
  notNeededReason: "",
});
const emptyExpense = () => ({
  bomItemId: "",
  label: "",
  quantity: "1",
  unitPrice: "",
  sellerName: "",
  purchasedOn: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hebron" }),
});
export function useFinanceEditor(finance: FinanceClient) {
  const [budget, setBudget] = useState({
    amount: finance.data?.budget?.amount ?? "",
    currency: finance.data?.budget?.currency ?? "ILS",
    expectedRevision: finance.data?.budget?.revision ?? (null as number | null),
  });
  const [bom, setBom] = useState(emptyBom);
  const [expense, setExpense] = useState(emptyExpense);
  const key = useRef(newExpenseKey());
  const [voidDraft, setVoidDraft] = useState<{
    id: string;
    expectedRevision: number;
    reason: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const disabled = finance.saving || !!finance.data?.readOnly;
  const quantity = (s: string) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 1000000;
  const editBom = (part: FinanceBom) => {
    setNotice("");
    setBom({
      id: part.id,
      expectedRevision: part.revision,
      name: part.name,
      quantityRequired: String(part.quantityRequired),
      estimatedUnitPrice: part.estimatedUnitPrice ?? "",
      notes: part.notes,
      isNeeded: part.isNeeded,
      notNeededReason: part.notNeededReason,
    });
  };
  const choosePart = (id: string) => {
    const part = finance.data?.bom.find((p) => p.id === id);
    setExpense((old) => ({
      ...old,
      bomItemId: id,
      label: part?.name ?? "",
      unitPrice: part?.estimatedUnitPrice ?? "",
    }));
  };
  return {
    budget,
    setBudget,
    bom,
    setBom,
    expense,
    setExpense,
    voidDraft,
    setVoidDraft,
    notice,
    disabled,
    editBom,
    choosePart,
    canBudget: !disabled && validMoney(budget.amount),
    canBom:
      !disabled &&
      !!finance.data?.budget &&
      !!bom.name.trim() &&
      quantity(bom.quantityRequired) &&
      (bom.estimatedUnitPrice === "" || validMoney(bom.estimatedUnitPrice)),
    canExpense:
      !disabled &&
      !!finance.data?.budget &&
      !!expense.label.trim() &&
      quantity(expense.quantity) &&
      validMoney(expense.unitPrice) &&
      /^\d{4}-\d{2}-\d{2}$/.test(expense.purchasedOn),
    cancelBom: () => setBom(emptyBom()),
    startNewExpense: () => {
      key.current = newExpenseKey();
      setExpense(emptyExpense());
      setNotice("");
    },
    prepareVoid: (e: FinanceExpense) =>
      setVoidDraft({ id: e.id, expectedRevision: e.revision, reason: "" }),
    saveBudget: async () => {
      setNotice("");
      if (await finance.save("budget", "PUT", budget)) {
        setBudget((old) => ({
          ...old,
          expectedRevision: old.expectedRevision === null ? 0 : old.expectedRevision + 1,
        }));
        setNotice("budgetSaved");
      }
    },
    latestBudget: async () => {
      const data = await finance.reload();
      if (data)
        setBudget({
          amount: data.budget?.amount ?? "",
          currency: data.budget?.currency ?? "ILS",
          expectedRevision: data.budget?.revision ?? null,
        });
    },
    saveBom: async () => {
      setNotice("");
      const body = {
        name: bom.name.trim(),
        quantityRequired: Number(bom.quantityRequired),
        estimatedUnitPrice: bom.estimatedUnitPrice || null,
        notes: bom.notes,
      };
      if (
        await finance.save(
          "bom" + (bom.id ? "/" + bom.id : ""),
          bom.id ? "PATCH" : "POST",
          bom.id
            ? {
                ...body,
                expectedRevision: bom.expectedRevision,
                isNeeded: bom.isNeeded,
                notNeededReason: bom.notNeededReason,
              }
            : body,
        )
      ) {
        setBom(emptyBom());
        setNotice("bomSaved");
      }
    },
    saveExpense: async () => {
      setNotice("");
      if (
        await finance.save("expenses", "POST", {
          requestKey: key.current,
          purchasedOn: expense.purchasedOn,
          sellerName: expense.sellerName,
          lines: [
            {
              ...(expense.bomItemId ? { bomItemId: expense.bomItemId } : {}),
              label: expense.label.trim(),
              quantity: Number(expense.quantity),
              unitPrice: expense.unitPrice,
            },
          ],
        })
      ) {
        key.current = newExpenseKey();
        setExpense(emptyExpense());
        setNotice("expenseSaved");
      }
    },
    saveVoid: async () => {
      if (
        voidDraft &&
        voidDraft.reason.trim() &&
        (await finance.save("expenses/" + voidDraft.id + "/void", "POST", {
          expectedRevision: voidDraft.expectedRevision,
          reason: voidDraft.reason.trim(),
        }))
      ) {
        setVoidDraft(null);
        setNotice("expenseVoided");
      }
    },
  };
}
