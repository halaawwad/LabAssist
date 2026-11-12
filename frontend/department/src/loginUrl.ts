import { sharedLoginUrl } from "../../../shared/web/demoSession";

export function loginUrl() {
  return sharedLoginUrl("department", import.meta.env, true).href;
}
