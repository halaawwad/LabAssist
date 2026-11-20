import { AccessLogin } from "../../../../shared/web/AccessLogin";
import { WebAccountAccess } from "../../../../shared/auth/WebAccountAccess";
export function SharedLoginRedirect(_props: { signedOut?: boolean }) {
  return new URLSearchParams(window.location.search).has("access") ? (
    <WebAccountAccess />
  ) : (
    <AccessLogin portalRole="workshop" />
  );
}
