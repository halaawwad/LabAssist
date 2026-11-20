import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Database } from "../../database/database.service";
@Injectable()
export class AuthRepository {
  constructor(private db: Database) {}
  transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout: number },
  ): Promise<T> {
    return this.db.$transaction(work, options);
  }
  findLoginAccount(
    role: string,
    studentEmail: string,
    headEmail: string,
    headNumber: string,
    staffNumber: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$queryRaw<
      any[]
    >`SELECT * FROM labassist_student.accounts WHERE role=${role} AND ((role='STUDENT' AND email=${studentEmail}) OR (role='DEPARTMENT_HEAD' AND (email=${headEmail} OR employee_number=${headNumber})) OR (role IN ('SUPERVISOR','WORKSHOP_MANAGER') AND employee_number=${staffNumber}))`;
  }
  lockAccount(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT * FROM labassist_student.accounts WHERE id=${accountId}::uuid FOR UPDATE`;
  }
  createSession(
    accountId: string,
    accessHash: string,
    refreshHash: string,
    accessExpiresAt: Date,
    expiresAt: Date,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$executeRaw`INSERT INTO labassist_student.auth_sessions(account_id,access_hash,refresh_hash,access_expires_at,expires_at) VALUES(${accountId}::uuid,${accessHash},${refreshHash},${accessExpiresAt},${expiresAt})`;
  }
  findAccessSession(accessHash: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT a.*,s.id AS session_id FROM labassist_student.auth_sessions s JOIN labassist_student.accounts a ON a.id=s.account_id WHERE s.access_hash=${accessHash} AND s.revoked_at IS NULL AND s.access_expires_at>now() AND s.expires_at>now() AND a.status='ACTIVE'`;
  }
  lockRefreshSession(refreshHash: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT s.* FROM labassist_student.auth_sessions s WHERE s.refresh_hash=${refreshHash} AND s.revoked_at IS NULL AND s.expires_at>now() FOR UPDATE`;
  }
  findActiveAccount(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT * FROM labassist_student.accounts WHERE id=${accountId}::uuid AND status='ACTIVE'`;
  }
  rotateSession(
    accessHash: string,
    refreshHash: string,
    accessExpiresAt: Date,
    sessionId: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$executeRaw`UPDATE labassist_student.auth_sessions SET access_hash=${accessHash},refresh_hash=${refreshHash},access_expires_at=${accessExpiresAt} WHERE id=${sessionId}::uuid`;
  }
  revokeSession(sessionId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.auth_sessions SET revoked_at=now() WHERE id=${sessionId}::uuid`;
  }
  activateAccount(
    tokenHash: string,
    email: string,
    passwordHash: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$queryRaw<
      any[]
    >`SELECT labassist_student.activate_account(${tokenHash},${email},${passwordHash})`;
  }
  lockResetRecipient(email: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT id FROM labassist_student.accounts WHERE email=${email} AND status='ACTIVE' FOR UPDATE`;
  }
  consumePreviousResetTokens(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.password_reset_tokens SET used_at=now() WHERE account_id=${accountId}::uuid AND used_at IS NULL`;
  }
  createResetToken(accountId: string, tokenHash: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`INSERT INTO labassist_student.password_reset_tokens(account_id,token_hash,expires_at) VALUES(${accountId}::uuid,${tokenHash},now()+interval '30 minutes')`;
  }
  lockResetToken(tokenHash: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT * FROM labassist_student.password_reset_tokens WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at>now() FOR UPDATE`;
  }
  lockActiveResetAccount(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT id FROM labassist_student.accounts WHERE id=${accountId}::uuid AND status='ACTIVE' FOR UPDATE`;
  }
  updatePasswordHash(
    passwordHash: string,
    accountId: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    return tx.$executeRaw`UPDATE labassist_student.accounts SET password_hash=${passwordHash},updated_at=now() WHERE id=${accountId}::uuid`;
  }
  consumeResetTokens(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.password_reset_tokens SET used_at=now() WHERE account_id=${accountId}::uuid AND used_at IS NULL`;
  }
  revokeAccountSessions(accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.auth_sessions SET revoked_at=now() WHERE account_id=${accountId}::uuid AND revoked_at IS NULL`;
  }
  recordPasswordReset(actorId: string, accountId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`INSERT INTO labassist_student.audit_events(actor_id,event_key,subject_id) VALUES(${actorId}::uuid,'PASSWORD_RESET',${accountId}::uuid)`;
  }
}
