import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Actor, Role } from "../common/security/identity";
import { Database } from "../database/database.service";
import { BomDto, BudgetDto, ExpenseDto, UpdateBomDto, VoidExpenseDto } from "./project-finance.dto";
import type {
  ProjectFinance,
  FinanceBom,
  FinanceExpense,
  ProjectBudget,
} from "../../../../shared/contracts/project-finance";
type Tx = Prisma.TransactionClient;
@Injectable()
export class ProjectFinanceService {
  constructor(private db: Database) {}
  private async member<T>(
    actor: Actor,
    id: string,
    write: boolean,
    action: (tx: Tx, readOnly: boolean) => Promise<T>,
  ) {
    if (actor.role !== Role.STUDENT)
      throw new ForbiddenException("Project finances are available to students only.");
    try {
      return await this.db.$transaction(async (tx) => {
        if (write) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"finance:" + id}))`;
        const [member] = await tx.$queryRaw<
          { read_only: boolean }[]
        >`SELECT (p.status='ARCHIVED' OR t.starts_on>(now() AT TIME ZONE 'Asia/Hebron')::date OR (t.ends_on<(now() AT TIME ZONE 'Asia/Hebron')::date AND (e.incomplete_until IS NULL OR e.incomplete_until<now()))) AS read_only FROM labassist_student.project_students m JOIN labassist_student.projects p ON p.id=m.project_id JOIN labassist_student.academic_terms t ON t.id=p.term_id JOIN labassist_student.student_enrollments e ON e.student_id=m.student_id AND e.term_id=m.term_id WHERE m.project_id=${id}::uuid AND m.student_id=${actor.id}::uuid AND m.left_at IS NULL FOR SHARE OF m`;
        if (!member) throw new NotFoundException("Project finances not found.");
        if (write && member.read_only) throw new ForbiddenException("This project is read-only.");
        return action(tx, !!member.read_only);
      });
    } catch (error) {
      const e = error as { meta?: { code?: string; message?: string } };
      const code = e.meta?.code,
        message = e.meta?.message ?? "";
      if (code === "P0001" && /revision conflict|request key reused/i.test(message))
        throw new ConflictException(
          "The item changed or the purchase key was reused with different details.",
        );
      if (["23503", "23514", "P0001", "22P02", "22003", "22007", "22008"].includes(code ?? ""))
        throw new BadRequestException("Check the finance details, item ownership and receipt.");
      if (code === "23505") throw new ConflictException("This finance record already exists.");
      throw error;
    }
  }
  async read(actor: Actor, id: string): Promise<ProjectFinance> {
    return this.member(actor, id, false, async (tx, readOnly) => {
      const [budget] = await tx.$queryRaw<
        ProjectBudget[]
      >`SELECT s.currency,s.budget::numeric(24,2)::text AS amount,s.spent::numeric(24,2)::text AS spent,s.remaining::numeric(24,2)::text AS remaining,s.estimated_known::numeric(24,2)::text AS "estimatedKnown",s.unpriced_items::int AS "unpricedItems",b.revision FROM labassist_student.project_finance_summary s JOIN labassist_student.project_budgets b ON b.project_id=s.project_id WHERE s.project_id=${id}::uuid`;
      const bom = await tx.$queryRaw<
        FinanceBom[]
      >`SELECT id,name,quantity_required AS "quantityRequired",estimated_unit_price::text AS "estimatedUnitPrice",notes,is_needed AS "isNeeded",not_needed_reason AS "notNeededReason",revision,acquired_quantity::int AS "acquiredQuantity",missing_quantity::int AS "missingQuantity",supply_status AS "supplyStatus" FROM labassist_student.project_bom_summary WHERE project_id=${id}::uuid ORDER BY created_at,id`;
      const expenses = await tx.$queryRaw<
        FinanceExpense[]
      >`SELECT e.id,e.purchased_on::text AS "purchasedOn",e.seller_name AS "sellerName",e.status,t.amount::numeric(24,2)::text AS amount,e.revision,e.created_by AS "createdBy",e.void_reason AS "voidReason",e.receipt_file_id AS "receiptFileId",COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'bomItemId',l.bom_item_id,'label',l.label,'quantity',l.quantity,'unitPrice',l.unit_price::text,'total',l.total::text) ORDER BY l.id) FROM labassist_student.project_expense_lines l WHERE l.expense_id=e.id),'[]'::jsonb) AS lines FROM labassist_student.project_expenses e JOIN labassist_student.project_expense_totals t ON t.id=e.id WHERE e.project_id=${id}::uuid AND e.status<>'DRAFT' ORDER BY e.created_at DESC,e.id`;
      return { projectId: id, readOnly, budget: budget ?? null, bom, expenses };
    });
  }
  budget(actor: Actor, id: string, b: BudgetDto) {
    return this.member(actor, id, true, async (tx) => {
      const [old] = await tx.$queryRaw<
        { revision: number; currency: string }[]
      >`SELECT revision,currency FROM labassist_student.project_budgets WHERE project_id=${id}::uuid FOR UPDATE`;
      if ((old?.revision ?? null) !== b.expectedRevision)
        throw new ConflictException("Budget changed. Reload before saving.");
      if (old && old.currency !== b.currency)
        throw new BadRequestException("Budget currency cannot change after creation.");
      if (old) {
        await tx.$executeRaw`UPDATE labassist_student.project_budgets SET amount=${b.amount}::numeric,updated_by=${actor.id}::uuid WHERE project_id=${id}::uuid`;
        return { revision: old.revision + 1 };
      }
      await tx.$executeRaw`INSERT INTO labassist_student.project_budgets(project_id,currency,amount,created_by,updated_by) VALUES(${id}::uuid,${b.currency},${b.amount}::numeric,${actor.id}::uuid,${actor.id}::uuid)`;
      return { revision: 0 };
    });
  }
  createBom(actor: Actor, id: string, b: BomDto) {
    return this.member(actor, id, true, async (tx) => {
      if (
        !(
          await tx.$queryRaw<
            any[]
          >`SELECT project_id FROM labassist_student.project_budgets WHERE project_id=${id}::uuid`
        ).length
      )
        throw new BadRequestException("Set the project budget and currency first.");
      const [row] = await tx.$queryRaw<
        any[]
      >`INSERT INTO labassist_student.project_bom_items(project_id,name,quantity_required,estimated_unit_price,notes,created_by,updated_by) VALUES(${id}::uuid,${b.name.trim()},${b.quantityRequired},${b.estimatedUnitPrice}::numeric,${b.notes.trim()},${actor.id}::uuid,${actor.id}::uuid) RETURNING id,revision,estimated_unit_price::text AS "estimatedUnitPrice"`;
      return row;
    });
  }
  updateBom(actor: Actor, id: string, item: string, b: UpdateBomDto) {
    return this.member(actor, id, true, async (tx) => {
      const [old] = await tx.$queryRaw<
        { revision: number }[]
      >`SELECT revision FROM labassist_student.project_bom_items WHERE id=${item}::uuid AND project_id=${id}::uuid FOR UPDATE`;
      if (!old) throw new NotFoundException("BOM item not found.");
      if (old.revision !== b.expectedRevision) throw new ConflictException("BOM item changed.");
      const [row] = await tx.$queryRaw<
        any[]
      >`UPDATE labassist_student.project_bom_items SET name=${b.name.trim()},quantity_required=${b.quantityRequired},estimated_unit_price=${b.estimatedUnitPrice}::numeric,notes=${b.notes.trim()},is_needed=${b.isNeeded},not_needed_reason=${b.isNeeded ? "" : b.notNeededReason.trim()},updated_by=${actor.id}::uuid WHERE id=${item}::uuid RETURNING id,revision`;
      return row;
    });
  }
  expense(actor: Actor, id: string, b: ExpenseDto) {
    return this.member(actor, id, true, async (tx) => {
      const [date] = await tx.$queryRaw<
        { future: boolean }[]
      >`SELECT ${b.purchasedOn}::date>(now() AT TIME ZONE 'Asia/Hebron')::date AS future`;
      if (date.future) throw new BadRequestException("Purchase date cannot be in the future.");
      const lines = b.lines.map((l) => ({
        bom_item_id: l.bomItemId ?? null,
        label: l.label.trim(),
        quantity: l.quantity,
        unit_price: Number(l.unitPrice),
      }));
      const [created] = await tx.$queryRaw<
        { id: string }[]
      >`SELECT labassist_student.record_project_expense(${actor.id}::uuid,${id}::uuid,${b.requestKey}::uuid,${b.purchasedOn}::date,${b.sellerName.trim()},${JSON.stringify(lines)}::jsonb,${b.receiptFileId ?? null}::uuid) AS id`;
      const [row] = await tx.$queryRaw<
        any[]
      >`SELECT id,revision FROM labassist_student.project_expenses WHERE id=${created.id}::uuid`;
      return row;
    });
  }
  voidExpense(actor: Actor, id: string, expense: string, b: VoidExpenseDto) {
    return this.member(actor, id, true, async (tx) => {
      if (
        !(
          await tx.$queryRaw<
            any[]
          >`SELECT id FROM labassist_student.project_expenses WHERE id=${expense}::uuid AND project_id=${id}::uuid`
        ).length
      )
        throw new NotFoundException("Expense not found.");
      await tx.$queryRaw`SELECT labassist_student.void_project_expense(${actor.id}::uuid,${expense}::uuid,${b.expectedRevision}::int,${b.reason.trim()})`;
      const [row] = await tx.$queryRaw<
        any[]
      >`SELECT id,revision FROM labassist_student.project_expenses WHERE id=${expense}::uuid`;
      return row;
    });
  }
}
