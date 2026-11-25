import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createMarketClient, marketApiBaseUrl, type MarketSession } from "./client";

/** The demo navigation session does not authenticate API requests. */
export const unavailableMarketSession: MarketSession = {
  getAccessToken: async () => null,
  getCurrentUser: async () => null,
};
const MarketContext = createContext<{ session: MarketSession; baseUrl: string | null }>({
  session: unavailableMarketSession,
  baseUrl: marketApiBaseUrl(),
});
export function MarketSessionProvider({
  session,
  baseUrl = marketApiBaseUrl(),
  children,
}: {
  session: MarketSession;
  baseUrl?: string | null;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ session, baseUrl }), [session, baseUrl]);
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
export function useMarketClient() {
  const { session, baseUrl } = useContext(MarketContext);
  return useMemo(() => createMarketClient({ baseUrl, session }), [baseUrl, session]);
}
