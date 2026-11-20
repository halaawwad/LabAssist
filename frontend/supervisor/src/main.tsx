import { StrictMode } from "react";
import "../../../shared/web/brandFavicon";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { I18nProvider } from "./i18n/I18nProvider";
import { AccountProvider } from "./state/supervisor/AccountProvider";
import { NotificationsProvider } from "./state/supervisor/NotificationsProvider";
import { bootstrapDemoApp } from "../../../shared/web/demoSession";

const mount = () => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <I18nProvider>
          <AccountProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </AccountProvider>
        </I18nProvider>
      </BrowserRouter>
    </StrictMode>,
  );
};
if (import.meta.env.VITE_AUTH_MODE === "demo")
  void bootstrapDemoApp("supervisor", import.meta.env, mount);
else mount();
