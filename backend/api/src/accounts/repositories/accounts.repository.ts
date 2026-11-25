import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Database } from "../../database/database.service";
@Injectable()
export class AccountsRepository {
  constructor(private db: Database) {}
  transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout: number },
  ): Promise<T> {
    return this.db.$transaction(work, options);
  }
  revokeInvitations(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.activation_invitations SET revoked_at=now() WHERE student_id=${accountId}::uuid AND used_at IS NULL AND revoked_at IS NULL`;
  }
  createInvitation(
    accountId: string,
    invitedBy: string,
    tokenHash: string,
    expiresAt: Date,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$executeRaw`INSERT INTO labassist_student.activation_invitations(student_id,invited_by,token_hash,expires_at) VALUES(${accountId}::uuid,${invitedBy}::uuid,${tokenHash},${expiresAt})`;
  }
  createPendingAccount(
    role: string,
    fullName: string,
    email: string,
    universityNumber: string | null,
    employeeNumber: string | null,
    createdBy: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$queryRaw<
      any[]
    >`INSERT INTO labassist_student.accounts(role,full_name,email,university_number,employee_number,created_by) VALUES(${role},${fullName},${email},${universityNumber},${employeeNumber},${createdBy}::uuid) RETURNING *`;
  }
  recordProvision(actorId: string, accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`INSERT INTO labassist_student.audit_events(actor_id,event_key,subject_id) VALUES(${actorId}::uuid,'ACCOUNT_PROVISIONED',${accountId}::uuid)`;
  }
  lockPendingAccount(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT id FROM labassist_student.accounts WHERE id=${accountId}::uuid AND status='PENDING_ACTIVATION' FOR UPDATE`;
  }
  listAccounts(tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT id,role,full_name,email,university_number,employee_number,status FROM labassist_student.accounts ORDER BY created_at DESC,id`;
  }
  async rename(id: string, name: string, headId: string, tx: Prisma.TransactionClient) {
    await tx.$executeRaw`UPDATE labassist_student.accounts SET full_name=${name},updated_at=now() WHERE id=${id}::uuid`;
    await tx.$executeRaw`INSERT INTO labassist_student.audit_events(actor_id,event_key,subject_id) VALUES(${headId}::uuid,'ACCOUNT_NAME_CHANGED',${id}::uuid)`;
  }
  lockStatusAccount(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT id,role,status,activated_at FROM labassist_student.accounts WHERE id=${accountId}::uuid FOR UPDATE`;
  }
}
