export * from "../../../shared/department/workbook";
import { createTemplateBytes } from "../../../shared/department/workbook";
export function downloadTemplate() {
  const bytes = createTemplateBytes();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "labassist-department-template.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
