import type {
  ApiRole,
  AccountResponse as Account,
  SessionResponse as Session,
  LoginRequest,
  RefreshRequest,
} from "../contracts/auth";
export type { ApiRole, AccountResponse as Account } from "../contracts/auth";
export type TokenStore = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
};
type Transport = (
  url: string,
  options: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;
export class ApiError extends Error {
  status: number;
  requestId?: string;
  constructor(status: number, requestId?: string) {
    super(status === 0 ? "Connection unavailable" : `Account request failed (${status})`);
    this.status = status;
    if (requestId && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(requestId))
      this.requestId = requestId;
  }
}
export class SessionClient {
  account: Account | null = null;
  private access: string | null = null;
  private refreshFlight: Promise<Account | null> | null = null;
  private logoutFlight: Promise<void> | null = null;
  private epoch = 0;
  private base: string;
  private store: TokenStore;
  private transport: Transport;
  constructor(
    base: string,
    store: TokenStore,
    transport: Transport = (url, options) => fetch(url, options),
  ) {
    this.base = base;
    this.store = store;
    this.transport = transport;
  }
  private async request(path: string, body?: unknown, access?: string | null) {
    if (!this.base) throw new ApiError(0);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const res = await this.transport(this.base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: abort.signal,
      });
      if (!res.ok) {
        let requestId: string | undefined;
        try {
          const detail: unknown = await res.json();
          if (
            detail &&
            typeof detail === "object" &&
            "requestId" in detail &&
            typeof detail.requestId === "string"
          )
            requestId = detail.requestId;
        } catch {
          /* Non-JSON failures still retain their HTTP status. */
        }
        throw new ApiError(res.status, requestId);
      }
      return await res.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0);
    } finally {
      clearTimeout(timeout);
    }
  }
  publicRequest(path: string, body: unknown) {
    return this.request(path, body);
  }
  private async accept(session: Session, epoch: number) {
    if (epoch !== this.epoch) throw new ApiError(401);
    if (
      !session?.accessToken ||
      !session.refreshToken ||
      !session.account?.id ||
      session.account.status !== "ACTIVE"
    )
      throw new ApiError(401);
    await this.store.write(session.refreshToken);
    if (epoch !== this.epoch) {
      await this.store.clear();
      throw new ApiError(401);
    }
    this.access = session.accessToken;
    this.account = session.account;
    return session.account;
  }
  async login(role: ApiRole, identifier: string, password: string) {
    if (this.logoutFlight) await this.logoutFlight;
    const epoch = ++this.epoch;
    const input: LoginRequest = { role, identifier, password };
    const session = await this.request("/auth/login", input);
    return this.accept(session, epoch);
  }
  restore(): Promise<Account | null> {
    if (this.refreshFlight) return this.refreshFlight;
    const epoch = this.epoch;
    this.refreshFlight = (async () => {
      const token = await this.store.read();
      if (!token) return null;
      try {
        return await this.accept(
          await this.request("/auth/refresh", { refreshToken: token } satisfies RefreshRequest),
          epoch,
        );
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
          if (epoch === this.epoch) {
            this.access = null;
            this.account = null;
            await this.store.clear();
          }
          return null;
        }
        throw error;
      }
    })().finally(() => {
      this.refreshFlight = null;
    });
    return this.refreshFlight;
  }
  async me(): Promise<Account> {
    const attempted = this.access;
    try {
      return await this.request("/auth/me", undefined, attempted);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (this.access === attempted && !(await this.restore())) throw new ApiError(401);
      return this.request("/auth/me", undefined, this.access);
    }
  }
  logout(): Promise<void> {
    if (this.logoutFlight) return this.logoutFlight;
    ++this.epoch;
    const access = this.access;
    this.access = null;
    this.account = null;
    this.logoutFlight = (async () => {
      await this.store.clear();
      if (access) {
        try {
          await this.request("/auth/logout", {}, access);
        } catch {
          /* Local logout remains available offline. */
        }
      }
    })().finally(() => {
      this.logoutFlight = null;
    });
    return this.logoutFlight;
  }
}
