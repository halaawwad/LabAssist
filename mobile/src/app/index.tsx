import { Redirect } from "expo-router";

// No login yet: open the supervisor dashboard. This becomes a role-based redirect once auth exists.
export default function Index() {
  return <Redirect href="/supervisor/dashboard" />;
}
