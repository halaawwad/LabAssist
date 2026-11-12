export default function PdfDocument({ uri }: { uri: string }) {
  return (
    <iframe
      title="Final report PDF preview"
      src={uri}
      style={{ width: "100%", height: "100%", border: 0, flex: 1 }}
    />
  );
}
