import { createTransport } from "nodemailer";
import { Mailer } from "../../src/mail/services/mailer.service";
jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));
describe("mail recipient restriction", () => {
  const previous = process.env.SMTP_RECIPIENT_ALLOWLIST;
  afterEach(() => {
    if (previous === undefined) delete process.env.SMTP_RECIPIENT_ALLOWLIST;
    else process.env.SMTP_RECIPIENT_ALLOWLIST = previous;
    jest.resetAllMocks();
  });
  it("blocks a recipient outside the configured list before opening SMTP", async () => {
    process.env.SMTP_RECIPIENT_ALLOWLIST = "allowed@stu.najah.edu";
    await expect(
      new Mailer().send("other@stu.najah.edu", "http://localhost/activate"),
    ).rejects.toThrow("Recipient not enabled");
    expect(createTransport).not.toHaveBeenCalled();
  });
  it("sends to the original allowed recipient and closes the connection", async () => {
    process.env.SMTP_RECIPIENT_ALLOWLIST = " ALLOWED@stu.najah.edu ";
    const sendMail = jest.fn().mockResolvedValue({});
    const close = jest.fn();
    (createTransport as jest.Mock).mockReturnValue({ sendMail, close });
    await new Mailer().send("allowed@stu.najah.edu", "http://localhost/activate");
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "allowed@stu.najah.edu" }));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("closes SMTP after delivery failure so the queue can retry", async () => {
    delete process.env.SMTP_RECIPIENT_ALLOWLIST;
    const close = jest.fn();
    (createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error("offline")),
      close,
    });
    await expect(
      new Mailer().send("allowed@stu.najah.edu", "http://localhost/activate"),
    ).rejects.toThrow("offline");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
