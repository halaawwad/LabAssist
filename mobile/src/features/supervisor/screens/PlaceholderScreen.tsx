import { useRouter } from "@/native/router";

import { Card, EmptyState, LanguageToggle, ScreenContainer, ScreenHeader } from "@/components";
import { useLanguage } from "@/i18n";
import { colors } from "@/theme";

import { pageIcons, type SupervisorPageId } from "../navigation";

type PlaceholderScreenProps = {
  page: SupervisorPageId;
  /** Sections under "More" show a back button to the More list. */
  showBack?: boolean;
};

/** Stand-in for supervisor pages that are not built for mobile yet. */
export function PlaceholderScreen({ page, showBack = false }: PlaceholderScreenProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const Icon = pageIcons[page];

  // The More stack anchors its list underneath every section, so back normally has somewhere to go.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/supervisor/dashboard");
  };

  return (
    <ScreenContainer scroll edges={["top"]}>
      <ScreenHeader
        title={t(`supervisor.nav.${page}`)}
        onBack={showBack ? goBack : undefined}
        trailing={<LanguageToggle compact />}
      />
      <Card>
        <EmptyState
          icon={<Icon size={22} color={colors.primary} />}
          title={t("supervisor.placeholder.title")}
          message={t("supervisor.placeholder.message")}
        />
      </Card>
    </ScreenContainer>
  );
}
