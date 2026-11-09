export async function storePDF(data: string, _name: string) {
  const blob = await (await fetch(data)).blob();
  return URL.createObjectURL(blob);
}
export async function sharePDF(uri: string) {
  const a = document.createElement("a");
  a.href = uri;
  a.download = "Graduation-Project-final-report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
