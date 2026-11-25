import { CloudOff, KeyRound, Loader2, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadStatus } from "@/lib/market/useMarketData";
/** Loading, session, configuration and error states for live catalog/market data. Never falls back to samples. */
export function MarketStatus({
  status,
  message,
  onRetry,
  label,
  compact = false,
}: {
  status: LoadStatus;
  message: string;
  onRetry?: () => void;
  label: string;
  compact?: boolean;
}) {
  const box = compact
    ? "glass-inset rounded-xl p-3 text-xs"
    : "glass-panel rounded-2xl p-8 text-center";
  if (status === "loading")
    return (
      <div className={box} role="status" aria-busy="true">
        <Loader2
          size={18}
          className={`animate-spin text-primary ${compact ? "inline" : "mx-auto"}`}
        />{" "}
        Loading {label}…
      </div>
    );
  if (status === "session")
    return (
      <div className={box} role="status">
        <KeyRound size={20} className={`text-primary ${compact ? "inline" : "mx-auto"}`} />
        <h3 className="mt-2 text-sm font-bold">Sign-in required for live {label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {message} Live data needs a real LabAssist session, which is not connected in this web
          build yet. No sample data is shown instead.
        </p>
      </div>
    );
  if (status === "unconfigured")
    return (
      <div className={box} role="status">
        <CloudOff size={20} className={`text-primary ${compact ? "inline" : "mx-auto"}`} />
        <h3 className="mt-2 text-sm font-bold">Live {label} unavailable</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {message} Set VITE_LABASSIST_API_URL for this app. No sample data is shown instead.
        </p>
      </div>
    );
  if (status === "error")
    return (
      <div className={box} role="alert">
        <CloudOff size={20} className={`text-primary ${compact ? "inline" : "mx-auto"}`} />
        <h3 className="mt-2 text-sm font-bold">Could not load {label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        {onRetry && (
          <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>
            <RotateCcw size={13} /> Retry
          </Button>
        )}
      </div>
    );
  return null;
}
export function MarketEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <Search className="mx-auto text-primary" />
      <h3 className="mt-3 text-sm font-bold">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
export function LoadMore({
  nextCursor,
  loadingMore,
  moreError,
  onMore,
  label,
}: {
  nextCursor: string | null;
  loadingMore: boolean;
  moreError: string;
  onMore: () => void;
  label: string;
}) {
  if (!nextCursor) return null;
  return (
    <div className="mt-3 text-center">
      {moreError && (
        <p role="alert" className="mb-2 text-xs text-muted-foreground">
          {moreError}
        </p>
      )}
      <Button size="sm" variant="secondary" disabled={loadingMore} onClick={onMore}>
        {loadingMore
          ? "Loading…"
          : moreError
            ? `Retry loading more ${label}`
            : `Load more ${label}`}
      </Button>
    </div>
  );
}
