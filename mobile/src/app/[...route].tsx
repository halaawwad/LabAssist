import { useLocalSearchParams } from "expo-router";
import OriginalWebsite from "@/web/OriginalWebsite";
import { targetForRoute } from "@/web/targets";
export default function PortalRoute() {
  const { route } = useLocalSearchParams<{ route: string[] }>();
  const target = targetForRoute(Array.isArray(route) ? route : [route].filter(Boolean));
  return <OriginalWebsite {...target} />;
}
