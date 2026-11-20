import { Module } from "@nestjs/common";
import { Mailer } from "./services/mailer.service";
import { MailQueue } from "./services/mail-queue.service";
import { MailRepository } from "./repositories/mail.repository";
@Module({ providers: [Mailer, MailQueue, MailRepository], exports: [MailQueue] })
export class MailModule {}
