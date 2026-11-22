import { StrictMode } from "react";
import "../../../shared/web/brandFavicon";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Department from "./Department";
import { bootstrapDemoApp } from "../../../shared/web/demoSession";
import { apiMode } from "../../../shared/auth/web-session";
import { WebSessionBoundary } from "../../../shared/auth/WebSessionBoundary";
import { AccessLogin } from "../../../shared/web/AccessLogin";

const render = () => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {apiMode(import.meta.env) ? (
        window.location.pathname === "/login" ? (
          <AccessLogin portalRole="department" />
        ) : (
          <WebSessionBoundary role="department" env={import.meta.env}>
            <Department />
          </WebSessionBoundary>
        )
      ) : (
        <Department />
      )}
    </StrictMode>,
  );
};
if (apiMode(import.meta.env)) render();
else void bootstrapDemoApp("department", import.meta.env, render);
