import type { ReportAttachment } from "@/domain/workspace";
export async function attachmentURI(uri: string, _mime: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("Could not read attachment."));
    reader.readAsDataURL(blob);
  });
}
export async function downloadAttachment(attachment: ReportAttachment) {
  const a = document.createElement("a");
  a.href = attachment.uri;
  a.download = attachment.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
