import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Database } from "../../database/database.service";
@Injectable()
export class MailRepository {
  constructor(private db: Database) {}
  transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout: number },
  ): Promise<T> {
    return this.db.$transaction(work, options);
  }
  enqueue(accountId: string, encryptedPayload: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`INSERT INTO labassist_student.auth_mail_outbox(account_id,payload) VALUES(${accountId}::uuid,${encryptedPayload})`;
  }
  lockPendingBatch(tx: Prisma.TransactionClient = this.db) {
    return tx.$queryRaw<
      any[]
    >`SELECT o.id,o.payload,a.email FROM labassist_student.auth_mail_outbox o JOIN labassist_student.accounts a ON a.id=o.account_id WHERE o.sent_at IS NULL AND o.next_attempt_at<=now() ORDER BY o.created_at FOR UPDATE OF o SKIP LOCKED LIMIT 10`;
  }
  markSent(outboxId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.auth_mail_outbox SET sent_at=now(),payload='',attempts=attempts+1 WHERE id=${outboxId}::uuid`;
  }
  scheduleRetry(outboxId: string, tx: Prisma.TransactionClient = this.db) {
    return tx.$executeRaw`UPDATE labassist_student.auth_mail_outbox SET attempts=attempts+1,next_attempt_at=now()+interval '1 minute' WHERE id=${outboxId}::uuid`;
  }
}
