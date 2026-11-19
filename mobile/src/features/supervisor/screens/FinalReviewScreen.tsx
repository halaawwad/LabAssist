import { MobileModal as Modal } from "@/components/MobileModal";
import { demoSupervisor } from "../../../../../shared/web/domain";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "@/components";
import {
  Field,
  IconButton,
  Panel,
  SegmentedControl,
  SelectField,
  SheetHeader,
  kit,
  useCopy,
  ToggleSwitch,
} from "@/components/MobileKit";
import { colors } from "@/theme";
import {
  finalReportProjects,
  finalReportReviews,
  abetCriteria,
  type ReportBlock,
} from "@/domain/webSupervisor/finalReportsMockData";
import { useLocalPreview } from "@/lib/useLocalPreview";
import { isolateLtr, useLanguage } from "@/i18n";
import { formatDateTime, formatFileSize, formatLongDate } from "@/i18n/format";
import { useStatusLabel } from "@/features/shared/reportLabels";

function Block({ block }: { block: ReportBlock }) {
  if (block.kind === "figure")
    return (
      <View style={{ gap: 8 }}>
        <Image
          source={typeof block.image === "number" ? block.image : { uri: block.image }}
          style={{ width: "100%", height: 190 }}
          resizeMode="contain"
        />
        <AppText variant="caption">{block.caption}</AppText>
      </View>
    );
  if (block.kind === "table")
    return (
      <View style={{ gap: 6 }}>
        <AppText weight="bold">{block.caption}</AppText>
        <ScrollView horizontal>
          <View style={{ minWidth: 320 }}>
            {[block.head, ...block.rows].map((r, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  backgroundColor: i === 0 ? "#e4ebdc" : "#fff",
                  borderBottomWidth: 1,
                  borderColor: "#d9dfd3",
                }}
              >
                {r.map((v, j) => (
                  <View key={j} style={{ width: 130, padding: 10 }}>
                    <AppText variant="caption">{v}</AppText>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  if (block.kind === "entries")
    return (
      <View style={{ gap: 8 }}>
        {block.entries.map((e, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingLeft: e.level === 2 ? 16 : 0,
            }}
          >
            <AppText variant="caption" style={{ flex: 1 }}>
              {e.label}
            </AppText>
            <AppText variant="caption">{e.page}</AppText>
          </View>
        ))}
      </View>
    );
  if (block.kind === "definitions")
    return (
      <View style={{ gap: 8 }}>
        {block.entries.map(([a, b], i) => (
          <AppText key={i}>
            {a} — {b}
          </AppText>
        ))}
      </View>
    );
  if (block.kind === "list")
    return (
      <View style={{ gap: 8 }}>
        {block.items.map((v, i) => (
          <AppText key={i}>
            {block.ordered ? `${i + 1}.` : "•"} {v}
          </AppText>
        ))}
      </View>
    );
  return (
    <AppText weight={block.kind === "heading" ? "bold" : "regular"} style={{ lineHeight: 26 }}>
      {block.text}
    </AppText>
  );
}
export function FinalReviewScreen() {
  const t = useCopy();
  const { state, actorId, retryLoading } = useWorkspace();
  const {
    value: reviews,
    setValue: setReviews,
    ready,
    error,
  } = useLocalPreview("labassist.mobile.supervisor.final-reviews.web", finalReportReviews);
  const actor = state.users.find((user) => user.id === actorId);
  const supervisorId =
    actor?.role === "supervisor"
      ? (actor.canonicalId ?? (actor.id === "d1" ? demoSupervisor.id : actor.id))
      : "";
  const projects = finalReportProjects.filter(
    (project) =>
      project.supervisorIds.includes(supervisorId) &&
      reviews.some(
        (review) => review.id === project.id && review.submissions.at(-1)?.status !== "draft",
      ),
  );
  if (!ready)
    return <AppText>{t("Loading saved reviews...", "جارٍ تحميل المراجعات المحفوظة...")}</AppText>;
  if (error.startsWith("Could not load"))
    return (
      <Panel title={t("Could not load reviews", "تعذر تحميل المراجعات")}>
        <AppText>
          {t(
            "Could not load saved changes. Existing data is preserved; allow storage and retry loading.",
            "تعذر تحميل التغييرات المحفوظة. البيانات الحالية محفوظة؛ اسمح بالتخزين وأعد المحاولة.",
          )}
        </AppText>
        <Button title={t("Retry", "إعادة المحاولة")} onPress={retryLoading} />
      </Panel>
    );
  if (!projects.length)
    return (
      <AppText>
        {t(
          "No submitted reports from linked project groups. Private drafts are not available.",
          "لا توجد تقارير مسلّمة من مجموعات المشاريع المرتبطة. المسودات الخاصة غير متاحة.",
        )}
      </AppText>
    );
  return (
    <LinkedFinalReviewScreen
      key={supervisorId + projects.map((p) => p.id).join(",")}
      projects={projects}
      reviews={reviews}
      setReviews={setReviews}
      saveError={error}
    />
  );
}
function LinkedFinalReviewScreen({
  projects,
  reviews,
  setReviews,
  saveError,
}: {
  projects: typeof finalReportProjects;
  reviews: typeof finalReportReviews;
  saveError: string;
  setReviews: (
    value:
      | typeof finalReportReviews
      | ((current: typeof finalReportReviews) => typeof finalReportReviews),
  ) => Promise<boolean>;
}) {
  const { state, actorId } = useWorkspace();
  const t = useCopy();
  const { language } = useLanguage();
  const statusLabel = useStatusLabel();
  const [chosen, setChosen] = useState(projects[0].id),
    [tab, setTab] = useState("Report"),
    [page, setPage] = useState(0),
    [slide, setSlide] = useState(0),
    [full, setFull] = useState(false),
    [body, setBody] = useState(""),
    [notice, setNotice] = useState("");
  const p = projects.find((p) => p.id === chosen)!,
    review = reviews.find((r) => r.id === chosen)!,
    submission = review.submissions.at(-1)!,
    reportPage = p.pages[Math.min(page, p.pages.length - 1)],
    currentSlide = p.slides[Math.min(slide, p.slides.length - 1)];
  const submitted = submission.status !== "draft";
  async function feedback(kind: "comment" | "revision" | "approval") {
    if (!submitted || (!body.trim() && kind !== "approval")) return;
    if (kind !== "comment" && submission.status !== "submitted") return;
    if (
      (await setReviews(
        reviews.map((r) =>
          r.id === chosen
            ? {
                ...r,
                submissions: r.submissions.map((s, i) =>
                  i === r.submissions.length - 1
                    ? {
                        ...s,
                        status:
                          kind === "approval"
                            ? "approved"
                            : kind === "revision"
                              ? "revision"
                              : s.status,
                        reviewedAt: new Date().toISOString().slice(0, 10),
                      }
                    : s,
                ),
                feedback: [
                  ...r.feedback,
                  {
                    id: String(Date.now()),
                    supervisorId:
                      state.users.find((user) => user.id === actorId)?.canonicalId ?? actorId,
                    text: body.trim() || "Approved.",
                    kind,
                    date: new Date().toISOString().slice(0, 10),
                    version: submission.version,
                  },
                ],
              }
            : r,
        ),
      )) === false
    )
      return false;
    setBody("");
    setNotice(
      kind === "approval"
        ? t("Report approved.", "تم اعتماد التقرير.")
        : t("Feedback saved.", "تم حفظ الملاحظات."),
    );
  }
  const slideView = (
    <Panel tint="#eaf0e3">
      <AppText variant="caption">
        {p.name} · {t("Slide", "الشريحة")} {isolateLtr(`${slide + 1}/${p.slides.length}`)}
      </AppText>
      <AppText variant="title">{currentSlide.title}</AppText>
      {currentSlide.subtitle && <AppText>{currentSlide.subtitle}</AppText>}
      {currentSlide.items?.map((v, i) => (
        <AppText key={i}>• {v}</AppText>
      ))}
      {currentSlide.table && (
        <Block block={{ id: "slide-table", kind: "table", caption: "", ...currentSlide.table }} />
      )}
    </Panel>
  );
  const pager = (index: number, count: number, set: (value: number) => void, unit: string) => (
    <View style={styles.pager}>
      <IconButton
        icon={ChevronLeft}
        flipInRTL
        label={t(`Previous ${unit.toLowerCase()}`, `${unit} السابقة`)}
        disabled={!index}
        onPress={() => set(index - 1)}
      />
      <AppText weight="semibold" align="center" accessibilityLiveRegion="polite" style={kit.grow}>
        {unit} {index + 1} / {count}
      </AppText>
      <IconButton
        icon={ChevronRight}
        flipInRTL
        label={t(`Next ${unit.toLowerCase()}`, `${unit} التالية`)}
        disabled={index === count - 1}
        onPress={() => set(index + 1)}
      />
    </View>
  );
  const reviewPanel = (
    <Panel title={t("Review this submitted version", "مراجعة النسخة المسلّمة")}>
      <AppText variant="caption" tone="muted">
        {isolateLtr(submission.fileName)} · {isolateLtr(submission.version)}
      </AppText>
      <Field
        label={t("Page / section and feedback", "الصفحة / القسم والملاحظات")}
        value={body}
        onChangeText={setBody}
        multiline
      />
      {!!saveError && (
        <AppText tone="danger" accessibilityRole="alert">
          {t(
            "Could not save changes on this device. Your input is preserved; try again.",
            "تعذر حفظ التغييرات على هذا الجهاز. ملاحظاتك محفوظة؛ حاول مجددًا.",
          )}
        </AppText>
      )}
      <Button
        title={t("Add comment", "إضافة تعليق")}
        fullWidth
        disabled={!body.trim()}
        onPress={async () => await feedback("comment")}
      />
      <View style={kit.wrap}>
        <Button
          title={t("Request changes", "طلب تعديلات")}
          variant="secondary"
          disabled={!body.trim() || submission.status !== "submitted"}
          onPress={async () => await feedback("revision")}
        />
        <Button
          title={t("Approve report", "اعتماد التقرير")}
          variant="secondary"
          disabled={submission.status !== "submitted"}
          onPress={async () => await feedback("approval")}
        />
      </View>
    </Panel>
  );
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <SelectField
        label={t("Project", "المشروع")}
        value={chosen}
        onChange={(v) => {
          setChosen(v);
          setPage(0);
          setSlide(0);
          setBody("");
        }}
        options={projects.map((item) => {
          const latest = reviews.find((r) => r.id === item.id)?.submissions.at(-1);
          return {
            id: item.id,
            label: item.name,
            detail: `${isolateLtr(item.code)} · ${latest ? statusLabel(latest.status) : ""} ${latest ? isolateLtr(latest.version) : ""}`,
          };
        })}
      />
      <View style={styles.summary}>
        <Image source={p.image as unknown as number} style={styles.thumb} />
        <View style={kit.grow}>
          <AppText variant="caption" tone="muted">
            {isolateLtr(p.code)} · {p.students.map((s) => s.name).join(" · ")}
          </AppText>
          <AppText weight="semibold" tone="primary">
            {statusLabel(submission.status)} · {isolateLtr(submission.version)}
          </AppText>
          <AppText variant="caption">
            {isolateLtr(submission.fileName)} · {isolateLtr(submission.pageCount)}{" "}
            {t("pages", "صفحة")} · {formatFileSize(language, submission.fileSizeMb)}
          </AppText>
          {submission.submittedAt && (
            <AppText variant="caption" tone="muted">
              {t("Submitted", "سُلّم")} {formatDateTime(language, submission.submittedAt)}
            </AppText>
          )}
        </View>
      </View>
      <SegmentedControl
        accessibilityLabel={t("Report section", "قسم التقرير")}
        value={tab}
        onChange={setTab}
        options={[
          { id: "Report", label: t("Report", "التقرير") },
          { id: "Presentation", label: t("Presentation", "العرض") },
          { id: "ABET", label: "ABET" },
          { id: "History", label: t("History", "السجل") },
        ]}
      />
      {!submitted ? (
        <Panel title={t("Not submitted", "لم يُسلّم")}>
          <AppText>
            {t(
              "This team’s working draft is private. It becomes available here after submission.",
              "مسودة الفريق خاصة، وتظهر هنا بعد التسليم.",
            )}
          </AppText>
        </Panel>
      ) : (
        <>
          {tab === "Report" && (
            <>
              <View style={styles.viewer}>
                <SelectField
                  label={t("Go to section", "انتقل إلى قسم")}
                  value={String(page)}
                  onChange={(v) => setPage(Number(v))}
                  options={p.pages.map((v, i) => ({
                    id: String(i),
                    label:
                      v.title ??
                      (v.section.toLowerCase() === "cover" ? t("Cover", "الغلاف") : v.section),
                    detail: `${v.section.toLowerCase() === "cover" ? t("Cover", "الغلاف") : v.section} · ${v.number ? `${t("Page", "صفحة")} ${v.number}` : t("Cover", "الغلاف")}`,
                  }))}
                />
                <View style={styles.paper}>
                  <AppText variant="caption" tone="muted">
                    {reportPage.section.toLowerCase() === "cover"
                      ? t("Cover", "الغلاف")
                      : reportPage.section}{" "}
                    · {t("Page", "صفحة")} {reportPage.number || t("Cover", "الغلاف")}
                  </AppText>
                  {reportPage.title && (
                    <AppText variant="title" align="center">
                      {reportPage.title}
                    </AppText>
                  )}
                  {reportPage.blocks.map((b) => (
                    <Block key={b.id} block={b} />
                  ))}
                </View>
                {pager(page, p.pages.length, setPage, t("Page", "الصفحة"))}
              </View>
              {reviewPanel}
            </>
          )}
          {tab === "Presentation" && (
            <>
              <AppText variant="caption" tone="muted">
                {isolateLtr(p.presentationFile.fileName)} ·{" "}
                {isolateLtr(p.presentationFile.pageCount)} {t("slides", "شرائح")}
              </AppText>
              <View style={styles.viewer}>
                {slideView}
                {pager(slide, p.slides.length, setSlide, t("Slide", "الشريحة"))}
              </View>
              <Button
                title={t("Present full screen", "عرض بملء الشاشة")}
                variant="secondary"
                onPress={() => setFull(true)}
              />
              <Field
                label={t(`Comment on slide ${slide + 1}`, `تعليق على الشريحة ${slide + 1}`)}
                value={body}
                onChangeText={setBody}
                multiline
              />
              {!!saveError && (
                <AppText tone="danger" accessibilityRole="alert">
                  {t(
                    "Could not save changes on this device. Your input is preserved; try again.",
                    "تعذر حفظ التغييرات على هذا الجهاز. ملاحظاتك محفوظة؛ حاول مجددًا.",
                  )}
                </AppText>
              )}
              <Button
                title={t("Save slide comment", "حفظ تعليق الشريحة")}
                fullWidth
                disabled={!body.trim()}
                onPress={async () => {
                  if (
                    (await setReviews(
                      reviews.map((r) =>
                        r.id === chosen
                          ? {
                              ...r,
                              feedback: [
                                ...r.feedback,
                                {
                                  id: String(Date.now()),
                                  text: `Slide ${slide + 1}: ${body}`,
                                  date: new Date().toISOString().slice(0, 10),
                                  version: submission.version,
                                  kind: "comment",
                                },
                              ],
                            }
                          : r,
                      ),
                    )) === false
                  )
                    return false;
                  setBody("");
                  setNotice(t("Slide comment saved.", "تم حفظ تعليق الشريحة."));
                }}
              />
            </>
          )}
          {tab === "ABET" && (
            <Panel title={t("Report coverage checklist", "قائمة تغطية التقرير")}>
              {abetCriteria.map((id) => (
                <View key={id} style={styles.criterion}>
                  <View style={kit.grow}>
                    <AppText weight="semibold">{id}</AppText>
                    <AppText variant="caption">{p.criterionPages[id]}</AppText>
                  </View>
                  <ToggleSwitch
                    accessibilityLabel={id}
                    value={review.criteria[id] ?? !review.missing.includes(id)}
                    onValueChange={async (v) => {
                      await setReviews(
                        reviews.map((r) =>
                          r.id === chosen ? { ...r, criteria: { ...r.criteria, [id]: v } } : r,
                        ),
                      );
                    }}
                  />
                </View>
              ))}
            </Panel>
          )}
          {tab === "History" && (
            <>
              <AppText variant="label" tone="strong" accessibilityRole="header">
                {t("Submitted versions", "النسخ المسلّمة")}
              </AppText>
              <View style={kit.list}>
                {review.submissions.map((s, index) => (
                  <View key={s.version} style={[styles.historyRow, index > 0 && styles.divider]}>
                    <AppText weight="semibold">
                      {isolateLtr(s.version)} · {statusLabel(s.status)}
                    </AppText>
                    <AppText variant="caption">{isolateLtr(s.fileName)}</AppText>
                    <AppText variant="caption" tone="muted">
                      {s.submittedAt
                        ? formatDateTime(language, s.submittedAt)
                        : t("Draft", "مسودة")}{" "}
                      · {isolateLtr(s.pageCount)} {t("pages", "صفحة")} ·{" "}
                      {formatFileSize(language, s.fileSizeMb)}
                    </AppText>
                  </View>
                ))}
              </View>
              <AppText variant="label" tone="strong" accessibilityRole="header">
                {t("Feedback", "الملاحظات")}
              </AppText>
              {!review.feedback.length && (
                <AppText tone="muted">{t("No feedback yet.", "لا توجد ملاحظات بعد.")}</AppText>
              )}
              {!!review.feedback.length && (
                <View style={kit.list}>
                  {review.feedback.map((f, index) => (
                    <View key={f.id} style={[styles.historyRow, index > 0 && styles.divider]}>
                      <AppText weight="semibold">
                        {statusLabel(f.kind)} · {isolateLtr(f.version)}
                      </AppText>
                      <AppText>{f.text}</AppText>
                      <AppText variant="caption" tone="muted">
                        {formatLongDate(language, f.date)}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}
      {!!notice && <AppText accessibilityRole="alert">{notice}</AppText>}
      <Modal visible={full} onRequestClose={() => setFull(false)}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.full}>
          <SheetHeader
            title={p.name}
            subtitle={`${t("Slide", "الشريحة")} ${slide + 1} / ${p.slides.length}`}
            onClose={() => setFull(false)}
          />
          <ScrollView contentContainerStyle={styles.fullBody}>{slideView}</ScrollView>
          <View style={styles.fullFooter}>
            {pager(slide, p.slides.length, setSlide, t("Slide", "الشريحة"))}
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 28 },
  summary: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  viewer: {
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  paper: { gap: 12, padding: 14, borderRadius: 12, backgroundColor: "#fffcf5" },
  pager: { flexDirection: "row", alignItems: "center", gap: 10 },
  criterion: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 },
  historyRow: { gap: 2, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderColor: colors.line },
  full: { flex: 1, backgroundColor: "#f1f4eb" },
  fullBody: { padding: 16, flexGrow: 1, justifyContent: "center" },
  fullFooter: { padding: 16, borderTopWidth: 1, borderColor: colors.line },
});
