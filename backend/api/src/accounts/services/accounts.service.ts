import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MailQueue } from "../../mail/services/mail-queue.service";
import { actor, Actor, digest, identity, Role, secret } from "../../common/security/identity";
import { AccountDto } from "../dto/account.dto";
import { AccountsRepository } from "../repositories/accounts.repository";
@Injectable()
export class AccountsService {
  constructor(
    private repository: AccountsRepository,
    private mail: MailQueue,
  ) {}
  private async invitation(tx: Prisma.TransactionClient, accountId: string, headId: string) {
    const token = secret(),
      expires = new Date(Date.now() + Number(process.env.ACTIVATION_HOURS ?? 24) * 3600000);
    await this.repository.revokeInvitations(accountId, tx);
    await this.repository.createInvitation(accountId, headId, digest(token), expires, tx);
    await this.mail.enqueue(tx, accountId, `${process.env.PUBLIC_APP_URL}/activate?token=${token}`);
  }
  async provision(input: AccountDto, head: Actor) {
    const data = identity(input);
    const result = await this.repository.transaction(async (tx) => {
      const rows = await this.repository.createPendingAccount(
        data.role,
        data.fullName,
        data.email,
        data.universityNumber ?? null,
        data.employeeNumber ?? null,
        head.id,
        tx,
      );
      await this.invitation(tx, rows[0].id, head.id);
      await this.repository.recordProvision(head.id, rows[0].id, tx);
      return actor(rows[0]);
    });
    await this.mail.flush();
    return result;
  }
  async resend(id: string, head: Actor) {
    await this.repository.transaction(async (tx) => {
      const rows = await this.repository.lockPendingAccount(id, tx);
      if (!rows.length) throw new BadRequestException("Pending account required.");
      await this.invitation(tx, id, head.id);
    });
    await this.mail.flush();
    return { ok: true };
  }
  async list() {
    const rows = await this.repository.listAccounts();
    return rows.map(actor);
  }
  async rename(id: string, fullName: string, head: Actor) {
    const name = fullName.trim();
    if (!name) throw new BadRequestException("Enter a full name.");
    await this.repository.transaction(async (tx) => {
      const rows = await this.repository.lockStatusAccount(id, tx);
      if (!rows.length || rows[0].role === Role.DEPARTMENT_HEAD)
        throw new BadRequestException("A non-head account is required.");
      await this.repository.rename(id, name, head.id, tx);
    });
    return { ok: true };
  }
}
