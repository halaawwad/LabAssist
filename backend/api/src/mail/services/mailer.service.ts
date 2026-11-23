import { Injectable } from "@nestjs/common";
import { createTransport } from "nodemailer";
@Injectable()
export class Mailer {
  async send(email: string, url: string) {
    const restriction = process.env.SMTP_RECIPIENT_ALLOWLIST;
    if (restriction !== undefined) {
      const allowed = restriction
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (!allowed.includes(email.trim().toLowerCase()))
        throw Error("Recipient not enabled for SMTP delivery.");
    }
    const transporter = createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1026),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.NODE_ENV === "production",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "LabAssist <no-reply@labassist.local>",
        to: email,
        subject: "LabAssist account access",
        text: `Open this link to complete your account action:\n${url}\nIf you did not request this, contact your department.`,
      });
    } finally {
      transporter.close();
    }
  }
}
