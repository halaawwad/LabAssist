import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { ReportAttachment } from "@/domain/workspace";
export async function attachmentURI(uri: string, mime: string) {
  return `data:${mime};base64,${await new File(uri).base64()}`;
}
export async function downloadAttachment(attachment: ReportAttachment) {
  const file = new File(Paths.cache, attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
  await file.write(Uint8Array.from(atob(attachment.uri.split(",")[1]), (c) => c.charCodeAt(0)));
  if (!(await Sharing.isAvailableAsync())) throw Error("Sharing is unavailable on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: attachment.mime });
}
