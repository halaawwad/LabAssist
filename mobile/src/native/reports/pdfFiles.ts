import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function storePDF(data: string, name: string) {
  const file = new File(Paths.cache, `${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-final-report.pdf`);
  await file.write(Uint8Array.from(atob(data.split(",")[1]), (c) => c.charCodeAt(0)));
  return file.uri;
}
export async function sharePDF(uri: string) {
  if (!(await Sharing.isAvailableAsync())) throw Error("Sharing is unavailable on this device.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
