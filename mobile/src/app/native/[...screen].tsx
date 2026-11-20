import { useLocalSearchParams } from "expo-router";
import { useRole } from "@/state/WorkspaceProvider";
import { NativeScreen } from "@/native/NativeScreen";

/** Older links and the supervisor section hrefs use these spellings. */
const aliases: Record<string, string> = { "final-reports": "finalReports" };

export default function Route() {
  const { screen } = useLocalSearchParams<{ screen: string[] }>();
  const [requestedRole, ...rest] = Array.isArray(screen) ? screen : [];
  const role =
    requestedRole === "supervisor" || requestedRole === "workshop" ? requestedRole : "student";
  const ready = useRole(role);
  if (!ready) return null;
  // `/{role}/more` is the More tab; `/{role}/more/{page}` is a compatibility path to `page`.
  const parts = rest[0] === "more" && rest.length > 1 ? rest.slice(1) : rest;
  const page = parts.join("/") || "dashboard";
  return <NativeScreen role={role} page={aliases[page] ?? page} />;
}
