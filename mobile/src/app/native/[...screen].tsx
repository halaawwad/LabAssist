import { useLocalSearchParams } from "expo-router";
import { useRole } from "@/state/WorkspaceProvider";
import { NativeScreen } from "@/native/NativeScreen";
export default function Route() {
  const { screen } = useLocalSearchParams<{ screen: string[] }>();
  const [requestedRole, ...rest] = Array.isArray(screen) ? screen : [];
  const role =
    requestedRole === "supervisor" || requestedRole === "workshop" ? requestedRole : "student";
  const ready = useRole(role);
  if (!ready) return null;
  const parts = rest.filter((x) => x !== "more");
  return <NativeScreen role={role} page={parts.join("/") || "dashboard"} />;
}
