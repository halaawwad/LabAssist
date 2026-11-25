import { createFileRoute } from "@tanstack/react-router";
import { AccessLogin } from "../../../../shared/web/AccessLogin";
import { WebAccountAccess } from "../../../../shared/auth/WebAccountAccess";
export const Route = createFileRoute("/login")({ ssr: false, component: Login });
function Login() {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("access") ? (
    <WebAccountAccess />
  ) : (
    <AccessLogin />
  );
}
