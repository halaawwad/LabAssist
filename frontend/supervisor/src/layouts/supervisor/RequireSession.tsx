import { WebSessionBoundary } from "../../../../../shared/auth/WebSessionBoundary";
import { apiMode } from "../../../../../shared/auth/web-session";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAccount } from "../../state/supervisor/accountContext";

/** Sends signed-out visitors to the sign-in entry instead of the portal. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAccount();
  if (apiMode(import.meta.env))
    return (
      <WebSessionBoundary role="supervisor" env={import.meta.env}>
        {children}
      </WebSessionBoundary>
    );
  return isSignedIn ? children : <Navigate to="/login" replace />;
}
