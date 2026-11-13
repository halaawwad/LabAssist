import { useState } from "react";
import { Image, Modal, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit } from "@/components/MobileKit";
import {
  finalReportProjects,
  finalReportReviews,
  abetCriteria,
  type ReportBlock,
} from "@/domain/webSupervisor/finalReportsMockData";
import { useLocalPreview } from "@/lib/useLocalPreview";

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
  const [chosen, setChosen] = useState(finalReportProjects[0].id),
    [tab, setTab] = useState("Report"),
    [page, setPage] = useState(0),
    [slide, setSlide] = useState(0),
    [full, setFull] = useState(false),
    [body, setBody] = useState(""),
    [notice, setNotice] = useState("");
  const { value: reviews, setValue: setReviews } = useLocalPreview(
    "labassist.mobile.supervisor.final-reviews.web",
    finalReportReviews,
  );
  const p = finalReportProjects.find((p) => p.id === chosen)!,
    review = reviews.find((r) => r.id === chosen)!,
    submission = review.submissions.at(-1)!,
    reportPage = p.pages[Math.min(page, p.pages.length - 1)],
    currentSlide = p.slides[Math.min(slide, p.slides.length - 1)];
  const submitted = submission.status !== "draft";
  function feedback(kind: "comment" | "revision" | "approval") {
    if (!submitted || (!body.trim() && kind !== "approval")) return;
    setReviews(
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
                  text: body.trim() || "Approved.",
                  kind,
                  date: new Date().toISOString().slice(0, 10),
                  version: submission.version,
                },
              ],
            }
          : r,
      ),
    );
    setBody("");
    setNotice(kind === "approval" ? "Report approved." : "Feedback saved.");
  }
  const slideView = (
    <Panel tint="#eaf0e3">
      <AppText variant="caption">
        {p.name} · Slide {slide + 1}/{p.slides.length}
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
  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
      <AppText variant="title">Final Reports</AppText>
      <AppText tone="muted">
        Submitted reports, presentation slides and supervisor feedback.
      </AppText>
      <Chips
        value={chosen}
        onChange={(v) => {
          setChosen(v);
          setPage(0);
          setSlide(0);
          setBody("");
        }}
        options={finalReportProjects.map((p) => ({ id: p.id, label: p.name }))}
      />
      <Panel>
        <Image
          source={p.image as unknown as number}
          style={{ width: "100%", height: 140, borderRadius: 18 }}
        />
        <AppText variant="title">{p.name}</AppText>
        <AppText>
          {p.code} · {p.students.map((s) => s.name).join(" · ")}
        </AppText>
        <AppText tone="primary">
          {submission.status} · {submission.version}
        </AppText>
        <AppText variant="caption">
          {submission.fileName} · {submission.pageCount} pages · {submission.fileSizeMb} MB
        </AppText>
        {submission.submittedAt && (
          <AppText variant="caption">Submitted {submission.submittedAt.replace("T", " ")}</AppText>
        )}
      </Panel>
      <Chips
        value={tab}
        onChange={setTab}
        options={["Report", "Presentation", "ABET", "History", "Feedback"].map((id) => ({
          id,
          label: id,
        }))}
      />
      {!submitted ? (
        <Panel title="Not submitted">
          <AppText>
            This team’s working draft is private. It becomes available here after submission.
          </AppText>
        </Panel>
      ) : (
        <>
          {tab === "Report" && (
            <>
              <Chips
                value={String(page)}
                onChange={(v) => setPage(Number(v))}
                options={p.pages.map((v, i) => ({ id: String(i), label: v.title ?? v.section }))}
              />
              <Panel tint="#fffcf5">
                <AppText variant="caption">
                  {reportPage.section} · Page {reportPage.number || "Cover"}
                </AppText>
                {reportPage.title && (
                  <AppText variant="title" align="center">
                    {reportPage.title}
                  </AppText>
                )}
                {reportPage.blocks.map((b) => (
                  <Block key={b.id} block={b} />
                ))}
              </Panel>
              <View style={kit.wrap}>
                <Button
                  title="Previous page"
                  size="sm"
                  disabled={!page}
                  onPress={() => setPage(page - 1)}
                />
                <Button
                  title="Next page"
                  size="sm"
                  disabled={page === p.pages.length - 1}
                  onPress={() => setPage(page + 1)}
                />
              </View>
            </>
          )}
          {tab === "Presentation" && (
            <>
              <AppText variant="caption">
                {p.presentationFile.fileName} · {p.presentationFile.pageCount} slides
              </AppText>
              {slideView}
              <View style={kit.wrap}>
                <Button
                  title="Previous"
                  disabled={!slide}
                  size="sm"
                  onPress={() => setSlide(slide - 1)}
                />
                <Button
                  title="Next"
                  disabled={slide === p.slides.length - 1}
                  size="sm"
                  onPress={() => setSlide(slide + 1)}
                />
                <Button title="Present full screen" variant="soft" onPress={() => setFull(true)} />
              </View>
              <Field
                label={`Comment on slide ${slide + 1}`}
                value={body}
                onChangeText={setBody}
                multiline
              />
              <Button
                title="Save slide comment"
                disabled={!body.trim()}
                onPress={() => {
                  setBody(`Slide ${slide + 1}: ${body}`);
                  setReviews(
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
                  );
                  setBody("");
                  setNotice("Slide comment saved.");
                }}
              />
            </>
          )}
          {tab === "ABET" && (
            <Panel title="Report coverage checklist">
              {abetCriteria.map((id) => (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{id}</AppText>
                    <AppText variant="caption">{p.criterionPages[id]}</AppText>
                  </View>
                  <Switch
                    value={review.criteria[id] ?? !review.missing.includes(id)}
                    onValueChange={(v) =>
                      setReviews(
                        reviews.map((r) =>
                          r.id === chosen ? { ...r, criteria: { ...r.criteria, [id]: v } } : r,
                        ),
                      )
                    }
                  />
                </View>
              ))}
            </Panel>
          )}
          {tab === "History" &&
            review.submissions.map((s) => (
              <Panel key={s.version} title={s.version}>
                <AppText>{s.fileName}</AppText>
                <AppText>
                  {s.status} · {s.submittedAt ?? "Draft"}
                </AppText>
                <AppText variant="caption">
                  {s.pageCount} pages · {s.fileSizeMb} MB
                </AppText>
              </Panel>
            ))}
          {tab === "Feedback" && (
            <>
              <Panel title="Review submitted version">
                <Field
                  label="Page / section and feedback"
                  value={body}
                  onChangeText={setBody}
                  multiline
                />
                <View style={kit.wrap}>
                  <Button
                    title="Add comment"
                    disabled={!body.trim()}
                    onPress={() => feedback("comment")}
                  />
                  <Button
                    title="Request changes"
                    variant="soft"
                    disabled={!body.trim()}
                    onPress={() => feedback("revision")}
                  />
                  <Button
                    title="Approve report"
                    variant="soft"
                    onPress={() => feedback("approval")}
                  />
                </View>
              </Panel>
              {review.feedback.map((f) => (
                <Panel key={f.id}>
                  <AppText weight="bold">
                    {f.kind} · {f.version}
                  </AppText>
                  <AppText>{f.text}</AppText>
                  <AppText variant="caption">{f.date}</AppText>
                </Panel>
              ))}
            </>
          )}
        </>
      )}
      {!!notice && <AppText accessibilityRole="alert">{notice}</AppText>}
      <Modal visible={full} onRequestClose={() => setFull(false)}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#f1f4eb",
            padding: 18,
            justifyContent: "center",
            gap: 14,
          }}
        >
          <ScrollView>{slideView}</ScrollView>
          <View style={kit.wrap}>
            <Button title="Previous" disabled={!slide} onPress={() => setSlide(slide - 1)} />
            <Button
              title="Next"
              disabled={slide === p.slides.length - 1}
              onPress={() => setSlide(slide + 1)}
            />
            <Button title="Close" variant="soft" onPress={() => setFull(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}
