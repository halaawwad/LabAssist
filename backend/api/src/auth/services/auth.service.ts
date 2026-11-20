import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { MailQueue } from "../../mail/services/mail-queue.service";
import { actor, digest, secret } from "../../common/security/identity";
import { ActivateDto, LoginDto, PasswordDto } from "../dto/auth.dto";
import { AuthRepository } from "../repositories/auth.repository";
const invalid = () => new UnauthorizedException("Invalid sign-in details or session.");
@Injectable()
export class AuthService {
  constructor(
    private repository: AuthRepository,
    private mail: MailQueue,
  ) {}
  private dummyHash = argon2.hash(secret(), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  private accessTime() {
    return new Date(Date.now() + Number(process.env.ACCESS_MINUTES ?? 15) * 60000);
  }
  private refreshTime() {
    return new Date(Date.now() + Number(process.env.REFRESH_DAYS ?? 14) * 86400000);
  }
  async login(input: LoginDto) {
    const identifier = input.identifier.trim().toLowerCase();
    const rows = await this.repository.findLoginAccount(
      input.role,
      identifier,
      identifier,
      identifier,
      identifier,
    );
    const found = rows[0];
    const matches = await argon2.verify(
      found?.password_hash ?? (await this.dummyHash),
      input.password,
    );
    if (!found?.password_hash || !matches || found.status !== "ACTIVE") throw invalid();
    return this.repository.transaction(async (tx) => {
      const locked = await this.repository.lockAccount(found.id, tx);
      if (locked[0].status !== "ACTIVE" || locked[0].password_hash !== found.password_hash)
        throw invalid();
      const accessToken = secret(),
        refreshToken = secret(),
        accessExpiresAt = this.accessTime();
      await this.repository.createSession(
        found.id,
        digest(accessToken),
        digest(refreshToken),
        accessExpiresAt,
        this.refreshTime(),
        tx,
      );
      return { accessToken, refreshToken, accessExpiresAt, account: actor(locked[0]) };
    });
  }
  async authenticate(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
    const rows = await this.repository.findAccessSession(digest(token));
    if (!rows[0]) throw invalid();
    return { account: actor(rows[0]), sessionId: rows[0].session_id as string };
  }
  async refresh(token: string) {
    return this.repository.transaction(async (tx) => {
      const rows = await this.repository.lockRefreshSession(digest(token), tx);
      if (!rows[0]) throw invalid();
      const session = rows[0],
        accounts = await this.repository.findActiveAccount(session.account_id, tx);
      if (!accounts[0]) throw invalid();
      const accessToken = secret(),
        refreshToken = secret(),
        accessExpiresAt = this.accessTime();
      await this.repository.rotateSession(
        digest(accessToken),
        digest(refreshToken),
        accessExpiresAt,
        session.id,
        tx,
      );
      return { accessToken, refreshToken, accessExpiresAt, account: actor(accounts[0]) };
    });
  }
  async logout(sessionId: string) {
    await this.repository.revokeSession(sessionId);
    return { ok: true };
  }
  async activate(input: ActivateDto) {
    const encoded = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.repository.activateAccount(
      digest(input.token),
      input.email.trim().toLowerCase(),
      encoded,
    );
    return { ok: true };
  }
  async forgot(email: string) {
    await this.repository.transaction(async (tx) => {
      const rows = await this.repository.lockResetRecipient(email.trim().toLowerCase(), tx);
      if (!rows.length) return;
      const id = rows[0].id,
        token = secret();
      await this.repository.consumePreviousResetTokens(id, tx);
      await this.repository.createResetToken(id, digest(token), tx);
      await this.mail.enqueue(
        tx,
        id,
        `${process.env.PUBLIC_APP_URL}/reset-password?token=${token}`,
      );
    });
    await this.mail.flush();
    return { message: "If the account is eligible, an email will be sent." };
  }
  async reset(input: PasswordDto) {
    const encoded = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.repository.transaction(async (tx) => {
      const rows = await this.repository.lockResetToken(digest(input.token), tx);
      if (!rows.length) throw new BadRequestException("Link invalid or expired.");
      const id = rows[0].account_id;
      const accounts = await this.repository.lockActiveResetAccount(id, tx);
      if (!accounts.length) throw new BadRequestException("Link invalid or expired.");
      await this.repository.updatePasswordHash(encoded, id, tx);
      await this.repository.consumeResetTokens(id, tx);
      await this.repository.revokeAccountSessions(id, tx);
      await this.repository.recordPasswordReset(id, id, tx);
    });
    return { ok: true };
  }
}
