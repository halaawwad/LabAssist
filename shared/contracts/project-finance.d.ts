export type BudgetInput = { amount: string; currency: string; expectedRevision: number | null };
export type BomInput = {
  name: string;
  quantityRequired: number;
  estimatedUnitPrice: string | null;
  notes: string;
};
export type BomUpdate = BomInput & {
  expectedRevision: number;
  isNeeded: boolean;
  notNeededReason: string;
};
export type ExpenseLineInput = {
  bomItemId?: string;
  label: string;
  quantity: number;
  unitPrice: string;
};
export type ExpenseInput = {
  requestKey: string;
  purchasedOn: string;
  sellerName: string;
  receiptFileId?: string;
  lines: ExpenseLineInput[];
};
export type ProjectBudget = {
  currency: string;
  amount: string;
  spent: string;
  remaining: string;
  estimatedKnown: string;
  unpricedItems: number;
  revision: number;
};
export type FinanceBom = BomInput & {
  id: string;
  revision: number;
  isNeeded: boolean;
  notNeededReason: string;
  acquiredQuantity: number;
  missingQuantity: number;
  supplyStatus: "NEEDED" | "PARTIAL" | "ACQUIRED" | "NOT_NEEDED";
};
export type FinanceExpense = {
  id: string;
  purchasedOn: string;
  sellerName: string;
  status: "POSTED" | "VOIDED";
  amount: string;
  revision: number;
  createdBy: string;
  voidReason: string;
  receiptFileId: string | null;
  lines: (Omit<ExpenseLineInput, "bomItemId"> & {
    bomItemId: string | null;
    id: string;
    total: string;
  })[];
};
export type ProjectFinance = {
  projectId: string;
  readOnly: boolean;
  budget: ProjectBudget | null;
  bom: FinanceBom[];
  expenses: FinanceExpense[];
};
