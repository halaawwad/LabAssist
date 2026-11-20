import { AccessLogin } from "../../../../../shared/web/AccessLogin";
import { WebAccountAccess } from "../../../../../shared/auth/WebAccountAccess";
export function Login() {
  return new URLSearchParams(window.location.search).has("access") ? (
    <WebAccountAccess />
  ) : (
    <AccessLogin portalRole="supervisor" />
  );
}
