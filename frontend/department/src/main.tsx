import { StrictMode } from "react";
import "../../../shared/web/brandFavicon";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Department from "./Department";
import { bootstrapDemoApp } from "../../../shared/web/demoSession";

void bootstrapDemoApp("department", import.meta.env, () => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Department />
    </StrictMode>,
  );
});
