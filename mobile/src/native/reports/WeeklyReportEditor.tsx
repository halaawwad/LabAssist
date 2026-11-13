import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, CheckCircle2, Download, FileText, X } from "lucide-react-native";
import Svg, { Line, Pattern, Rect, Defs, Circle } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import { AppText, Button } from "@/components";
import { Chips, Panel, Portrait, Ring, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import type { Report, ReportAttachment } from "@/domain/workspace";
import { attachmentURI, downloadAttachment } from "./attachments";
import { router } from "../router";

export function WeeklyReportEditor({
  report,
  onSelect,
}: {
  report: Report;
  onSelect: (id: string) => void;
}) {
  const { state, act, error: saveError } = useWorkspace();
  const t = useCopy();
  const project = state.projects.find((p) => p.id === report.projectId)!;
  const draftFields = report.status === "submitted" && !report.openedBy.length ? report.editableDraft?.fields ?? report.fields : report.fields;
  const [fields, setFields] = useState<Record<string, string>>({
    ...(draftFields),
    progressPercent:
      draftFields.progressPercent ??
      String(
        Math.round(
          (state.tasks.filter(
            (task) => task.projectId === report.projectId && task.done,
          ).length /
            Math.max(1, state.tasks.filter((task) => task.projectId === report.projectId).length)) *
            100,
        ),
      ),
    hasDelays:
      draftFields.hasDelays ??
      (draftFields.delays && !/^(none|no)$/i.test(draftFields.delays) ? "true" : "false"),
    recovery: draftFields.recovery ?? "",
  });
  const [attachments, setAttachments] = useState<ReportAttachment[]>(report.editableDraft?.attachments ?? report.attachments ?? []),
    [editing, setEditing] = useState(!!report.editableDraft && report.status === "submitted" && !report.openedBy.length),
    [preview, setPreview] = useState(false),
    [draftsOpen, setDraftsOpen] = useState(false),
    [notice, setNotice] = useState(""),
    [withdraw, setWithdraw] = useState(false),
    [history, setHistory] = useState(false);
  const editable = report.status === "draft" || editing,
    canChange = report.status === "submitted" && !report.openedBy.length;
  const all = state.reports
      .filter((r) => r.projectId === report.projectId && r.kind === "weekly")
      .sort((a, b) => b.week - a.week),
    drafts = all.filter((r) => (r.status === "draft" && r.savedAt) || r.editableDraft);
  const tasks = fields.tasks?.split("\n").filter((line) => line.trim()) ?? [];
  const percent = Number(fields.progressPercent);
  const previous = all.find((r) => r.week === report.week - 1 && r.status !== "draft"),
    previousPercent =
      previous?.fields.progressPercent === undefined
        ? null
        : Number(previous.fields.progressPercent);
  const change = (key: string, value: string) => setFields({ ...fields, [key]: value });
  const entries = [
    {
      key: "completed",
      label: "Completed Work",
      prompt: "What did your team build, test, or document this week?",
    },
    {
      key: "tasks",
      label: "Tasks Completed",
      prompt: "List completed tasks, one per line. Write None if no tasks were completed.",
    },
    {
      key: "progress",
      label: "Progress Description",
      prompt: "Explain the progress represented by this percentage.",
    },
    {
      key: "delays",
      label: "Delay Reason",
      prompt: "What caused the delay and which work was affected?",
    },
    {
      key: "recovery",
      label: "Recovery Plan",
      prompt: "How will you get back on track?",
      optional: true,
    },
    {
      key: "problems",
      label: "Problems",
      prompt: "Describe technical or other blockers. Write None if there were no problems.",
    },
    {
      key: "plan",
      label: "Next Week Plan",
      prompt: "What will you work on, who will do it, and what outcome do you expect?",
    },
  ];
  const validate = () => {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      return "Progress must be between 0 and 100%.";
    const missing = entries
      .filter(
        (e) =>
          !e.optional &&
          (e.key !== "delays" || fields.hasDelays === "true") &&
          !fields[e.key]?.trim(),
      )
      .map((e) => e.label);
    return missing.length ? `Please complete: ${missing.join(", ")}.` : "";
  };
  async function save() {
    if (!editable) return false;
    if (await act({ type: "report.save", id: report.id, fields, attachments, draftOnly: editing })) {
      setDraftsOpen(true);
      setNotice(
        t(
          "Draft saved. Find it under Saved Drafts.",
          "تم حفظ المسودة. بتلاقيها في المسودات المحفوظة.",
        ),
      );
      return true;
    }
    return false;
  }
  function review() {
    const error = validate();
    if (error) {
      setNotice(error);
      return;
    }
    setNotice("");
    setPreview(true);
  }
  async function submit() {
    const error = validate();
    if (error) {
      setNotice(error);
      return;
    }
    if (editing && !canChange) {
      setNotice("This report has been opened for review and can no longer be edited.");
      setPreview(false);
      return;
    }
    if (await act({ type: "report.publish", id: report.id, fields, attachments })) {
      setPreview(false);
      setEditing(false);
      setNotice("Report submitted. You can edit or withdraw it until supervisor review.");
    }
  }
  async function attach() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0],
        mime = file.mimeType ?? "application/octet-stream";
      if (
        (file.size ?? 0) > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"].includes(mime)
      ) {
        setNotice("Choose a JPG, PNG, WebP, PDF or text file under 5 MB.");
        return;
      }
      setAttachments([
        ...attachments,
        {
          id: `attachment-${Date.now()}-${Math.random()}`,
          name: file.name,
          mime,
          uri: await attachmentURI(file.uri, mime),
        },
      ]);
    } catch {
      setNotice("Could not read this attachment.");
    }
  }
  const input = (key: string) => {
    const item = entries.find((x) => x.key === key)!;
    return (
      <View key={key} style={{ gap: 8 }}>
        <AppText weight="semibold">
          {item.label}
          {item.optional ? " · Optional" : ""}
        </AppText>
        <TextInput
          accessibilityLabel={item.label}
          value={fields[key] ?? ""}
          onChangeText={(text) => change(key, text)}
          multiline
          maxLength={5000}
          textAlignVertical="top"
          placeholder={item.prompt}
          style={s.input}
        />
      </View>
    );
  };
  const files = (remove: boolean) => (
    <View style={{ gap: 10 }}>
      {attachments.length ? (
        attachments.map((a) => (
          <View key={a.id} style={s.file}>
            {a.mime.startsWith("image/") ? (
              <Image
                source={{ uri: a.uri }}
                accessibilityLabel={a.name}
                style={{ width: 45, height: 45, borderRadius: 9 }}
              />
            ) : (
              <FileText size={22} color="#73885b" />
            )}
            <AppText style={kit.grow}>{a.name}</AppText>
            {remove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${a.name}`}
                onPress={() => setAttachments(attachments.filter((x) => x.id !== a.id))}
                style={s.icon}
              >
                <X size={18} color="#8c735d" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Download ${a.name}`}
                onPress={() => downloadAttachment(a).catch((e) => setNotice(String(e)))}
                style={s.icon}
              >
                <Download size={18} color="#718457" />
              </Pressable>
            )}
          </View>
        ))
      ) : (
        <AppText tone="muted">No attachments added.</AppText>
      )}
    </View>
  );
  const paper = (
    <View style={s.paper}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="notebook" width="400" height="32" patternUnits="userSpaceOnUse">
            <Line x1={0} y1={31} x2={400} y2={31} stroke="#dedccc" strokeWidth={0.6} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#notebook)" />
        <Line x1={23} y1={0} x2={23} y2="100%" stroke="#e5bfb1" strokeWidth={1} />
        {[50, 180, 310, 440, 570, 700].map((y) => (
          <Circle key={y} cx={10} cy={y} r={4} fill="#e8e2cf" stroke="#d1c9b3" />
        ))}
      </Svg>
      <View style={s.paperContent}>
        <AppText style={s.kicker}>WEEKLY REPORT · WEEK {report.week}</AppText>
        <AppText style={s.paperTitle}>{project.title}</AppText>
        <AppText style={s.serif}>{project.description}</AppText>
        <View style={kit.wrap}>
          {project.studentIds.map((id) => (
            <View key={id} style={kit.row}>
              <Portrait userId={id} size={25} />
              <AppText style={{ fontSize: 11 }}>
                {state.users.find((u) => u.id === id)?.name}
              </AppText>
            </View>
          ))}
        </View>
        <View style={s.stamp}>
          <AppText weight="bold" tone="primary">
            {editable ? "READY TO SUBMIT" : report.status.toUpperCase()}
          </AppText>
        </View>
        <View style={s.metrics}>
          <Ring value={Number.isFinite(percent) ? percent : 0} />
          <View style={s.stats}>
            <View style={s.stat}>
              <AppText style={s.statLabel}>Tasks reported</AppText>
              <AppText style={s.number}>{tasks.length}</AppText>
            </View>
            <View style={s.stat}>
              <AppText style={s.statLabel}>Delays</AppText>
              <AppText style={s.number}>
                {fields.hasDelays === "true" ? "Reported" : "None"}
              </AppText>
            </View>
            <View style={s.stat}>
              <AppText style={s.statLabel}>Attachments</AppText>
              <AppText style={s.number}>{attachments.length}</AppText>
            </View>
          </View>
        </View>
        {[
          { title: "Weekly Summary", text: fields.completed },
          { title: "Next Steps", text: fields.plan },
          { title: "Progress", text: fields.progress },
          { title: "Tasks Completed", text: tasks.map((x) => `✓ ${x}`).join("\n") },
          { title: "Issues & Blockers", text: fields.problems },
          {
            title: "Delays & Recovery",
            text:
              fields.hasDelays === "true"
                ? `${fields.delays}${fields.recovery ? `\nRecovery plan: ${fields.recovery}` : ""}`
                : "No delays reported.",
          },
        ].map((item) => (
          <View key={item.title} style={{ gap: 12 }}>
            <AppText style={s.sectionHeading}>{item.title}</AppText>
            <AppText style={s.serif}>{item.text || "—"}</AppText>
          </View>
        ))}
        <AppText style={s.sectionHeading}>Attached Files</AppText>
        {files(false)}
        {report.submittedAt && (
          <AppText variant="caption" tone="muted">
            Submitted {new Date(report.submittedAt).toLocaleString()}
          </AppText>
        )}
        {report.feedback.map((f) => (
          <View key={f.id} style={{ gap: 10 }}>
            <AppText style={s.sectionHeading}>Supervisor Feedback</AppText>
            <AppText style={[s.serif, { fontStyle: "italic" }]}>{f.body}</AppText>
            <AppText variant="caption" tone="muted">
              {state.users.find((u) => u.id === f.authorId)?.name} ·{" "}
              {new Date(f.createdAt).toLocaleDateString()}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
  return (
    <View style={kit.stack}>
      <Panel tint="#eef2e7">
        <View style={kit.row}>
          <CalendarDays color="#728b5d" />
          <AppText variant="heading">Your weeks</AppText>
        </View>
        <AppText tone="muted">One shared report per project, each week.</AppText>
        <Button
          title={`Saved Drafts (${drafts.length})`}
          variant="soft"
          onPress={() => setDraftsOpen(!draftsOpen)}
        />
        {draftsOpen &&
          (drafts.length ? (
            drafts.map((d) => (
              <Button
                key={d.id}
                title={`Week ${d.week} · Saved ${new Date(d.savedAt!).toLocaleString()}`}
                variant="ghost"
                onPress={() => onSelect(d.id)}
              />
            ))
          ) : (
            <AppText tone="muted">
              Saved reports will appear here when you choose Save as Draft.
            </AppText>
          ))}
        <Chips
          value={report.id}
          options={all.map((r) => ({ id: r.id, label: `Week ${r.week} · ${r.status}` }))}
          onChange={onSelect}
        />
        <Button
          title="Start next weekly report"
          variant="soft"
          onPress={async () => {
            const week = Math.max(...all.map((r) => r.week)) + 1;
            if (await act({ type: "weekly.create", projectId: project.id, week }))
              onSelect("");
          }}
        />
      </Panel>
      <Panel>
        <AppText variant="caption" tone="primary">
          {project.title} / WEEKLY UPDATE
        </AppText>
        <View style={kit.row}>
          <AppText variant="title" style={kit.grow}>
            Week {report.week}
          </AppText>
          <AppText weight="semibold" tone="primary">
            {report.status}
          </AppText>
        </View>
        <AppText tone="muted">
          {report.submittedAt
            ? `Submitted ${new Date(report.submittedAt).toLocaleString()}`
            : report.savedAt
              ? `Last saved: ${new Date(report.savedAt).toLocaleString()}`
              : "Not saved yet"}
        </AppText>
      </Panel>
      {!!notice && (
        <AppText accessibilityRole="alert" style={s.notice}>
          {notice}
        </AppText>
      )}
      {canChange && (
        <Panel tint="#eaf0f7">
          <AppText weight="bold">
            {editing ? "Editing your submitted report" : "You can still make a change"}
          </AppText>
          <AppText tone="muted">
            Available until supervisor review. Your submitted version stays unchanged until you
            confirm edits.
          </AppText>
          {!editing && (
            <View style={kit.wrap}>
              <Button title="Edit Submission" variant="soft" onPress={() => setEditing(true)} />
              <Button
                title="Withdraw Submission"
                variant="ghost"
                onPress={() => setWithdraw(true)}
              />
            </View>
          )}
        </Panel>
      )}
      <Panel tint="#eef3e6">
        <AppText variant="heading">Report readiness</AppText>
        <View style={kit.wrap}>
          {entries
            .filter((e) => !e.optional && e.key !== "delays")
            .map((e) => (
              <View key={e.key} style={kit.row}>
                <CheckCircle2 size={14} color={fields[e.key]?.trim() ? "#6f8d55" : "#b6bda8"} />
                <AppText variant="caption">{e.label}</AppText>
              </View>
            ))}
        </View>
        <AppText weight="bold">
          {Number.isFinite(percent) ? percent : 0}% · Reported project progress
        </AppText>
        <AppText tone="muted">
          {previousPercent !== null
            ? `${percent - previousPercent >= 0 ? "+" : ""}${percent - previousPercent} points since the previous submitted report.`
            : "A weekly change will appear once a previous report is submitted."}
        </AppText>
      </Panel>
      {editable ? (
        <>
          <Panel tint="#f4f7ed">
            <AppText style={s.ordinal}>01</AppText>
            <AppText variant="heading">What we achieved</AppText>
            <AppText tone="muted">The work, the outcomes, and the steps you finished.</AppText>
            {input("completed")}
            <View style={kit.wrap}>
              <Button
                title="Import completed team tasks"
                variant="soft"
                onPress={() => {
                  const completed = state.tasks.filter(
                    (task) => task.projectId === project.id && task.done,
                  );
                  if (!completed.length) {
                    setNotice(
                      "No completed team tasks recorded yet. You can write other completed work below.",
                    );
                    return;
                  }
                  change(
                    "tasks",
                    [...new Set([...tasks, ...completed.map((task) => task.title)])].join("\n"),
                  );
                  setNotice(`${completed.length} completed team tasks imported.`);
                }}
              />
              <Button
                title="View team"
                variant="ghost"
                onPress={() => router.push("/native/student/team")}
              />
            </View>
            {input("tasks")}
          </Panel>
          <Panel tint="#eef3f9">
            <AppText style={[s.ordinal, { color: "#6389a5" }]}>02</AppText>
            <AppText variant="heading">Progress & blockers</AppText>
            <AppText tone="muted">Show what moved forward, and what needs attention.</AppText>
            <AppText weight="semibold">Project progress at week end</AppText>
            <View style={kit.row}>
              <TextInput
                accessibilityLabel="Project progress at week end"
                keyboardType="numeric"
                value={fields.progressPercent}
                onChangeText={(value) => change("progressPercent", value)}
                maxLength={4}
                style={[s.input, { minHeight: 48, width: 95 }]}
              />
              <AppText>%</AppText>
            </View>
            {input("progress")}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: fields.hasDelays === "true" }}
              accessibilityLabel="We experienced a delay this week"
              onPress={() => change("hasDelays", fields.hasDelays === "true" ? "false" : "true")}
              style={kit.row}
            >
              <CheckCircle2 size={22} color={fields.hasDelays === "true" ? "#6389a5" : "#aab4bb"} />
              <AppText style={kit.grow}>We experienced a delay this week</AppText>
            </Pressable>
            {fields.hasDelays === "true" && (
              <>
                {input("delays")}
                {input("recovery")}
              </>
            )}
            {input("problems")}
          </Panel>
          <Panel tint="#f5f0e8">
            <AppText style={[s.ordinal, { color: "#a58a61" }]}>03</AppText>
            <AppText variant="heading">Next week’s plan</AppText>
            <AppText tone="muted">Make your next steps practical and specific.</AppText>
            {input("plan")}
            <Button title="Attach evidence" variant="soft" onPress={attach} />
            <AppText variant="caption" tone="muted">
              Optional · JPG, PNG, WebP, PDF or text · up to 5 MB per file
            </AppText>
            {files(true)}
          </Panel>
          <AppText tone="muted">This report belongs to the whole team.</AppText>
          <View style={kit.wrap}>
            {editing && <Button title="Save editable draft" variant="soft" onPress={save} />}
            {editing ? (
              <Button
                title="Cancel editing"
                variant="soft"
                onPress={() => {
                  setFields({
                    ...report.fields,
                    progressPercent: report.fields.progressPercent ?? "0",
                    hasDelays: report.fields.hasDelays ?? "false",
                    recovery: report.fields.recovery ?? "",
                  });
                  setAttachments(report.attachments ?? []);
                  setEditing(false);
                }}
              />
            ) : (
              <Button title="Save as Draft" variant="soft" onPress={save} />
            )}
            <Button title="Preview" variant="soft" onPress={review} />
            <Button title={editing ? "Review Changes" : "Submit Report"} onPress={review} />
          </View>
        </>
      ) : (
        paper
      )}
      {!report.feedback.length && (
        <Panel title="Supervisor Feedback">
          <FileText size={24} color="#879b70" />
          <AppText tone="muted">
            {editable
              ? "Feedback will appear here after your report is submitted and reviewed."
              : "Waiting for supervisor review."}
          </AppText>
        </Panel>
      )}
      {(report.history?.length ?? 0) > 1 && (
        <Panel>
          <Button
            title={`Previous submissions (${report.history!.length - 1})`}
            variant="ghost"
            onPress={() => setHistory(!history)}
          />
          {history &&
            report.history!.slice(0, -1).map((v, i) => (
              <View key={v.id} style={{ gap: 8 }}>
                <AppText weight="bold">
                  Version {i + 1} · {new Date(v.submittedAt).toLocaleString()}
                </AppText>
                <AppText>{v.fields.completed}</AppText>
              </View>
            ))}
        </Panel>
      )}
      <Modal
        visible={preview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPreview(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeading}>
            <AppText variant="heading" style={kit.grow}>
              Review weekly report
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close weekly preview"
              onPress={() => setPreview(false)}
              style={s.icon}
            >
              <X color="#526443" />
            </Pressable>
          </View>
          {!!saveError && <AppText accessibilityRole="alert" tone="danger">{saveError}</AppText>}
          <ScrollView contentContainerStyle={{ padding: 10 }}>{paper}</ScrollView>
          <View style={s.modalFooter}>
            <Button title="Back to editing" variant="soft" onPress={() => setPreview(false)} />
            <Button title={editing ? "Confirm Changes" : "Confirm Submission"} onPress={submit} />
          </View>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={withdraw}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdraw(false)}
      >
        <View style={s.overlay}>
          <Panel>
            <AppText variant="heading">Withdraw this submission?</AppText>
            <AppText>
              Your report will return to Draft. Your writing and attachments will stay.
            </AppText>
            <Button title="Keep submission" variant="soft" onPress={() => setWithdraw(false)} />
            <Button
              title="Confirm withdrawal"
              onPress={async () => {
                if (await act({ type: "report.withdraw", id: report.id })) {
                  setWithdraw(false);
                  setEditing(false);
                  setNotice("Submission withdrawn. Your report is saved as a draft.");
                }
              }}
            />
          </Panel>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  input: {
    fontSize: 15,
    lineHeight: 24,
    color: "#263226",
    borderWidth: 1,
    borderColor: "#d6dfcb",
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    backgroundColor: "#ffffffdf",
  },
  notice: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#e9efdf",
    color: "#566c42",
    fontSize: 13,
    lineHeight: 22,
  },
  ordinal: { fontSize: 13, letterSpacing: 2, fontWeight: "700", color: "#79935b" },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dddccb",
    backgroundColor: "#ffffffc9",
  },
  icon: { minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center" },
  paper: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#faf7ed",
    borderWidth: 1,
    borderColor: "#ddd8c7",
  },
  paperContent: { paddingTop: 28, paddingBottom: 35, paddingLeft: 35, paddingRight: 17, gap: 26 },
  kicker: { fontSize: 10, letterSpacing: 1.6, color: "#6f7784" },
  paperTitle: { fontFamily: "Georgia", fontSize: 29, lineHeight: 37, color: "#111a2b" },
  serif: { fontFamily: "Georgia", fontSize: 15, lineHeight: 27, color: "#354039" },
  stamp: {
    alignSelf: "flex-end",
    padding: 9,
    borderWidth: 2,
    borderColor: "#869472",
    borderRadius: 8,
    transform: [{ rotate: "-6deg" }],
  },
  metrics: {
    gap: 18,
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#dcd9c8",
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  stat: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfd5bc",
    borderStyle: "dashed",
    borderRadius: 14,
    minWidth: 87,
    backgroundColor: "#ffffff80",
    gap: 10,
  },
  statLabel: { fontSize: 10, color: "#6e7d61" },
  number: { fontSize: 19, color: "#34442c", fontWeight: "600" },
  sectionHeading: {
    alignSelf: "flex-start",
    fontFamily: "Georgia",
    fontSize: 20,
    fontWeight: "700",
    color: "#172037",
    backgroundColor: "#e6ecd9",
    lineHeight: 29,
  },
  modal: { flex: 1, backgroundColor: "#f7f6ef" },
  modalHeading: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#dfe4d5",
  },
  modalFooter: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#dfe4d5",
  },
  overlay: { flex: 1, backgroundColor: "#17201670", justifyContent: "center", padding: 22 },
});

