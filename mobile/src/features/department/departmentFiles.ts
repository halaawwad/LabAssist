import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { DOMParser } from "@xmldom/xmldom";
import { readWorkbook, createTemplateBytes } from "../../../../shared/department/workbook";

export async function pickDepartmentWorkbook() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 2 * 1024 * 1024)
    throw new Error("Choose an .xlsx file up to 2 MB.");
  let bytes: Uint8Array;
  if (Platform.OS === "web") {
    const buffer = await (asset.file
      ? asset.file.arrayBuffer()
      : fetch(asset.uri).then((response) => response.arrayBuffer()));
    bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : Uint8Array.from(buffer);
  } else {
    const file = new File(asset.uri);
    if (file.size > 2 * 1024 * 1024) throw new Error("Choose an .xlsx file up to 2 MB.");
    bytes = await file.bytes();
  }
  const workbook = await readWorkbook(
    { name: asset.name, size: bytes.length, arrayBuffer: async () => new Uint8Array(bytes).buffer },
    (text) => {
      // xmldom supplies the same XML operations used by the browser-only reader.
      return new DOMParser({
        onError: () => {
          throw new Error("Invalid workbook XML.");
        },
      }).parseFromString(text, "application/xml") as unknown as Document;
    },
  );
  return { name: asset.name, workbook };
}
export async function shareDepartmentTemplate() {
  const bytes = createTemplateBytes();
  if (Platform.OS === "web") {
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
    return;
  }
  const file = new File(Paths.cache, "labassist-department-template.xlsx");
  file.create({ overwrite: true });
  file.write(bytes);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
