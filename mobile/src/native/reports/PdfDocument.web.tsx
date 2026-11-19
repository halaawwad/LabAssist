import { useCopy } from "@/components/MobileKit";
export default function PdfDocument({ uri }: { uri: string }) {
  const t = useCopy();
  return (
    <iframe
      title={t("Final report PDF preview", "معاينة PDF للتقرير النهائي")}
      src={uri}
      style={{ width: "100%", height: "100%", border: 0, flex: 1 }}
    />
  );
}
