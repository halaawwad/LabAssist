import { applicationRoot } from "../../../../shared/web/demoSession";

export function departmentUrl() {
  return applicationRoot("department", import.meta.env).href;
}

export function openDepartment(destination = departmentUrl()) {
  try {
    if (localStorage.getItem("labassist.department.preview")) {
      // The new port cannot read this origin's localStorage. Offer an explicit
      // file transfer before leaving, without deleting or changing the source.
      const transfer = new URL("/department-preview-data.html", window.location.origin);
      transfer.searchParams.set("destination", destination);
      window.location.assign(transfer.href);
      return;
    }
  } catch {
    // Storage may be unavailable; navigation must still work.
  }
  window.location.assign(destination);
}
