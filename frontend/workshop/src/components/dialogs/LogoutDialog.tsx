import { apiMode, logoutWeb } from "../../../../../shared/auth/web-session";
import { LogOut } from "lucide-react";
import { useI18n } from "../../i18n/i18nContext";
import { useWorkshop } from "../../state/workshopContext";
import { Modal } from "../Modal";
import { endDemoSession } from "../../../../../shared/web/demoSession";

export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { setSignedOut } = useWorkshop();

  return (
    <Modal
      title={t("logout.title")}
      subtitle={t("logout.body")}
      icon={<LogOut size={20} />}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (apiMode(import.meta.env)) {
                void logoutWeb(import.meta.env);
                return;
              }
              endDemoSession("workshop"); // Persist before the redirect; useLocalState also updates below.
              onClose();
              setSignedOut(true);
            }}
          >
            <LogOut size={16} />
            {t("logout.confirm")}
          </button>
        </>
      }
    >
      {null}
    </Modal>
  );
}
