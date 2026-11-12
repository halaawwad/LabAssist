import iconUrl from "./labassist-mark.svg";

// Import through Vite so both development and built apps resolve the shared asset.
const icon = document.createElement("link");
icon.rel = "icon";
icon.type = "image/svg+xml";
icon.href = iconUrl;
document.head.append(icon);
