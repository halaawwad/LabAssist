import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { WebSessionBoundary } from "../../../shared/auth/WebSessionBoundary";
import { WebAccountAccess } from "../../../shared/auth/WebAccountAccess";
import { useAccountAdmin } from "../../../shared/auth/useAccountAdmin";
import { roleCode, webClient, type WebRole } from "../../../shared/auth/web-session";
import { AccountAdministration } from "../../../frontend/department/src/components/AccountAdministration";
const roles: WebRole[] = ["student", "supervisor", "workshop", "department"];
const client = {
  account: null,
  restore: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  publicRequest: vi.fn(),
  authorizedRequest: vi.fn(),
};
vi.mock("../../../shared/auth/web-session", async (load) => ({
  ...(await load()),
  webClient: vi.fn(),
}));
const row = {
  id: "student",
  role: "STUDENT",
  status: "ACTIVE",
  fullName: "Test student",
  email: "s12345678@stu.najah.edu",
  universityNumber: "12345678",
};
beforeEach(() => {
  vi.mocked(webClient).mockReturnValue(client as never);
  client.account = null;
  client.authorizedRequest.mockResolvedValue([row]);
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
describe.each(roles)("%s account boundary", (role) => {
  const env = { VITE_AUTH_MODE: "api" };
  it("renders only after the server restores the matching role", async () => {
    client.restore.mockResolvedValue({ ...row, role: roleCode[role] });
    render(
      <WebSessionBoundary role={role} env={env}>
        <p>Private workspace</p>
      </WebSessionBoundary>,
    );
    await screen.findByText("Private workspace");
    expect(client.restore).toHaveBeenCalledTimes(1);
  });
  it("preserves the access boundary on a network failure and recovers on Retry", async () => {
    client.restore
      .mockRejectedValueOnce({ status: 0 })
      .mockResolvedValue({ ...row, role: roleCode[role] });
    render(
      <WebSessionBoundary role={role} env={env}>
        <p>Private workspace</p>
      </WebSessionBoundary>,
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("Private workspace")).toBeNull();
    fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("Private workspace");
  });
  it("does not expose workspace content for another role", async () => {
    const other = role === "student" ? "SUPERVISOR" : "STUDENT";
    const replace = vi.fn();
    const real = window;
    vi.stubGlobal(
      "window",
      new Proxy(real, {
        get(target, key) {
          if (key === "location") return { replace, origin: "http://localhost", search: "" };
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
    );
    client.restore.mockResolvedValue({ ...row, role: other });
    render(
      <WebSessionBoundary role={role} env={env}>
        <p>Private workspace</p>
      </WebSessionBoundary>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Private workspace")).toBeNull();
  });
});
describe("account activation and recovery forms", () => {
  it("submits activation credentials only after matching password validation", async () => {
    window.history.replaceState({}, "", "/activate?token=" + "a".repeat(43));
    client.publicRequest.mockResolvedValue({ ok: true });
    render(<WebAccountAccess mode="activate" />);
    fireEvent.change(screen.getByLabelText("University email"), { target: { value: row.email } });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "ExamplePassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "DifferentPassword123!" },
    });
    fireEvent.submit(screen.getByLabelText("New password").closest("form")!);
    await screen.findByRole("alert");
    expect(client.publicRequest).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "ExamplePassword123!" },
    });
    fireEvent.submit(screen.getByLabelText("New password").closest("form")!);
    await screen.findByText("Saved. You can now sign in.");
    expect(client.publicRequest).toHaveBeenCalledWith("/auth/activate", {
      token: "a".repeat(43),
      email: row.email,
      password: "ExamplePassword123!",
    });
  });
  it("retains form input after a rejected reset link", async () => {
    window.history.replaceState({}, "", "/reset-password?token=" + "b".repeat(43));
    client.publicRequest.mockRejectedValue({ status: 400 });
    render(<WebAccountAccess mode="reset-password" />);
    for (const label of ["New password", "Confirm password"])
      fireEvent.change(screen.getByLabelText(label), { target: { value: "ExamplePassword123!" } });
    fireEvent.submit(screen.getByLabelText("New password").closest("form")!);
    await screen.findByRole("alert");
    expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe(
      "ExamplePassword123!",
    );
  });
});
describe("Head account administration", () => {
  it("creates an account through the form and confirms disable explicitly", async () => {
    render(<AccountAdministration onAccounts={() => {}} />);
    await screen.findByText("Test student");
    fireEvent.click(screen.getByText("Add account"));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New student" } });
    fireEvent.change(screen.getByLabelText("University number"), { target: { value: "12345679" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(client.authorizedRequest).toHaveBeenCalledWith("/accounts", "POST", {
        role: "STUDENT",
        fullName: "New student",
        universityNumber: "12345679",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByText("Disable"));
    expect(client.authorizedRequest).not.toHaveBeenCalledWith("/accounts/student/status", "PATCH", {
      status: "DISABLED",
    });
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() =>
      expect(client.authorizedRequest).toHaveBeenCalledWith("/accounts/student/status", "PATCH", {
        status: "DISABLED",
      }),
    );
  });
  it("renders server accounts and filters their identity", async () => {
    render(<AccountAdministration onAccounts={() => {}} />);
    await screen.findByText("Test student");
    expect(client.authorizedRequest).toHaveBeenCalledWith("/accounts");
    expect(screen.getByText(row.email)).toBeTruthy();
  });
  it("does not retry an ambiguous save until accounts are reloaded", async () => {
    const { result } = renderHook(() => useAccountAdmin(client as never));
    await waitFor(() => expect(result.current.ready).toBe(true));
    client.authorizedRequest.mockRejectedValueOnce({ status: 0 });
    await act(async () => {
      await result.current.create({
        role: "STUDENT",
        fullName: "Test",
        universityNumber: "12345679",
      });
    });
    expect(result.current.ready).toBe(false);
    const count = client.authorizedRequest.mock.calls.length;
    await act(async () => {
      await result.current.create({
        role: "STUDENT",
        fullName: "Test",
        universityNumber: "12345679",
      });
    });
    expect(client.authorizedRequest).toHaveBeenCalledTimes(count);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.ready).toBe(true);
  });
});
