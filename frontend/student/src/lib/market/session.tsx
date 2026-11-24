import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createMarketClient, marketApiBaseUrl, type MarketSession } from "./client";
/** Default until the real web session (Noor's login integration) is connected: no token, no user. */
export const unavailableSession: MarketSession = {
  getAccessToken: async () => null,
  getCurrentUser: async () => null,
};
type MarketContextValue = {
  session: MarketSession;
  baseUrl: string | null;
  fetchImpl?: ((input: string, init: RequestInit) => Promise<Response>) | undefined;
};
const MarketContext = createContext<MarketContextValue | null>(null);
/**
 * Connects the catalog/market screens to a real session. The session integration supplies `session`;
 * `baseUrl` defaults to VITE_LABASSIST_API_URL. `fetchImpl` exists for tests only.
 */
export function MarketSessionProvider({
  session,
  baseUrl,
  fetchImpl,
  children,
}: {
  session: MarketSession;
  baseUrl?: string | null;
  fetchImpl?: MarketContextValue["fetchImpl"];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ session, baseUrl: baseUrl === undefined ? marketApiBaseUrl() : baseUrl, fetchImpl }),
    [session, baseUrl, fetchImpl],
  );
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
export function useMarketClient() {
  const context = useContext(MarketContext);
  const session = context?.session ?? unavailableSession;
  const baseUrl = context ? context.baseUrl : marketApiBaseUrl();
  const fetchImpl = context?.fetchImpl;
  return useMemo(
    () => createMarketClient({ baseUrl, session, fetchImpl }),
    [baseUrl, session, fetchImpl],
  );
}
