import WebView from "react-native-webview";
export default function PdfDocument({ uri }: { uri: string }) {
  return (
    <WebView
      source={{ uri }}
      originWhitelist={["*"]}
      style={{ flex: 1 }}
      allowingReadAccessToURL={uri}
    />
  );
}
