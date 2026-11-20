import { createFileRoute } from "@tanstack/react-router";
import { WebAccountAccess } from "../../../../shared/auth/WebAccountAccess";
export const Route = createFileRoute("/activate")({
  ssr: false,
  component: () => <WebAccountAccess mode="activate" />,
});
