import { createFileRoute } from "@tanstack/react-router";
import { WebAccountAccess } from "../../../../shared/auth/WebAccountAccess";
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: () => <WebAccountAccess mode="reset-password" />,
});
