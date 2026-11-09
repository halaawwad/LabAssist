import { File, Paths } from "expo-file-system";
export async function persistPickedFile(uri: string, name: string) {
  const target = new File(Paths.document, `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await new File(uri).copy(target);
  return target.uri;
}
