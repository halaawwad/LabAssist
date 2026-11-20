import "reflect-metadata";
import { AccountResponseDto } from "../../src/common/dto/account-response.dto";
import { SessionResponseDto } from "../../src/auth/dto/session-response.dto";
describe("Public authentication response contract", () => {
  const row = {
    id: "account-id",
    role: "STUDENT",
    full_name: "Demo Student",
    email: "s12345678@stu.najah.edu",
    status: "ACTIVE",
    university_number: "12345678",
    employee_number: null,
    password_hash: "PRIVATE_HASH",
    refresh_hash: "PRIVATE_REFRESH",
    internal_note: "PRIVATE_NOTE",
  };
  it("exposes exactly the account allowlist and drops database-only fields", () => {
    const account = JSON.parse(JSON.stringify(AccountResponseDto.from(row)));
    expect(Object.keys(account).sort()).toEqual(
      ["id", "role", "fullName", "email", "status", "universityNumber", "employeeNumber"].sort(),
    );
    expect(JSON.stringify(account)).not.toContain("PRIVATE_");
    expect(account.fullName).toBe(row.full_name);
  });
  it("serializes expiry as ISO text and preserves the documented session envelope", () => {
    const result = SessionResponseDto.create({
      accessToken: "access",
      refreshToken: "refresh",
      accessExpiresAt: new Date("2026-11-20T10:00:00Z"),
      account: AccountResponseDto.from(row),
    });
    expect(result.accessExpiresAt).toBe("2026-11-20T10:00:00.000Z");
    expect(Object.keys(result).sort()).toEqual(
      ["accessToken", "refreshToken", "accessExpiresAt", "account"].sort(),
    );
  });
});
