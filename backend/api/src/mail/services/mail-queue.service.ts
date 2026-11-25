import { Injectable, OnModuleDestroy, OnApplicationBootstrap } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Mailer } from "./mailer.service";
import { MailRepository } from "../repositories/mail.repository";
@Injectable()
export class MailQueue implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private key: Buffer;
  constructor(
    private repository: MailRepository,
    private mailer: Mailer,
  ) {
    const value = process.env.MAIL_ENCRYPTION_KEY ?? "";
    if (!/^[a-f0-9]{64}$/i.test(value))
      throw Error("MAIL_ENCRYPTION_KEY must be a 32-byte hex secret.");
    this.key = Buffer.from(value, "hex");
  }
  async enqueue(tx: Prisma.TransactionClient, id: string, url: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, iv),
      data = Buffer.concat([cipher.update(url, "utf8"), cipher.final()]);
    const payload = Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
    await this.repository.enqueue(id, payload, tx);
  }
  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.flush(), 5000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      await this.repository.transaction(
        async (tx) => {
          const rows = await this.repository.lockPendingBatch(tx);
          for (const row of rows) {
            try {
              const raw = Buffer.from(row.payload, "base64"),
                decipher = createDecipheriv("aes-256-gcm", this.key, raw.subarray(0, 12));
              decipher.setAuthTag(raw.subarray(12, 28));
              const url = Buffer.concat([
                decipher.update(raw.subarray(28)),
                decipher.final(),
              ]).toString("utf8");
              await this.mailer.send(row.email, url);
              await this.repository.markSent(row.id, tx);
            } catch {
              await this.repository.scheduleRetry(row.id, tx);
            }
          }
        },
        { timeout: 120000 },
      );
    } catch {
      /* Leave pending messages for retry; no secrets are logged. */
    } finally {
      this.running = false;
    }
  }
}
