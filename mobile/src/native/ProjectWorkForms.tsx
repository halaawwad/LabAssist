import { useState } from "react";
import { View } from "react-native";
import { AppText, Button } from "@/components";
import { MobileInput } from "@/components/MobileInput";
import { Disclosure } from "@/components/Disclosure";
import { kit, Panel, SegmentedControl, useCopy } from "@/components/MobileKit";
import type { ProjectIssue, ProjectIssueStatus } from "../../../shared/contracts/project-work";
import { useProjectWorkspace } from "./StudentReference";

export function LiveTaskForm() {
  const copy = useCopy();
  const workspace = useProjectWorkspace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(workspace.actorId);
  const [due, setDue] = useState("");
  return (
    <Disclosure title={copy("Add task", "إضافة مهمة")}>
      <View style={kit.stack}>
        <MobileInput
          accessibilityLabel={copy("Task title", "عنوان المهمة")}
          value={title}
          onChangeText={setTitle}
          maxLength={240}
        />
        <MobileInput
          accessibilityLabel={copy("Description", "الوصف")}
          value={description}
          onChangeText={setDescription}
          maxLength={10000}
          multiline
        />
        <MobileInput
          accessibilityLabel={copy("Due date", "تاريخ التسليم")}
          placeholder="YYYY-MM-DD"
          value={due}
          onChangeText={setDue}
          maxLength={10}
        />
        <SegmentedControl
          accessibilityLabel={copy("Assignee", "المكلّف بالمهمة")}
          value={assignee}
          onChange={setAssignee}
          options={workspace.members.map(({ id, name }) => ({ id, label: name }))}
        />
        <Button
          title={copy("Add task", "إضافة مهمة")}
          disabled={
            workspace.saving || !title.trim() || (due !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(due))
          }
          onPress={async () => {
            if (await workspace.createTask(title, assignee, description, due)) {
              setTitle("");
              setDescription("");
              setDue("");
            }
          }}
        />
      </View>
    </Disclosure>
  );
}

export function NativeProjectIssue({ issue }: { issue: ProjectIssue }) {
  const copy = useCopy();
  const workspace = useProjectWorkspace();
  const [draft, setDraft] = useState<ProjectIssue>();
  const statuses: { id: ProjectIssueStatus; label: string }[] = [
    { id: "OPEN", label: copy("Open", "مفتوحة") },
    { id: "MONITORING", label: copy("Monitoring", "قيد المتابعة") },
    { id: "RESOLVED", label: copy("Resolved", "محلولة") },
  ];
  return (
    <View style={kit.stack}>
      <AppText weight="semibold">{issue.title}</AppText>
      <AppText>{statuses.find(({ id }) => id === issue.status)?.label}</AppText>
      {!!issue.description && <AppText>{issue.description}</AppText>}
      {!!issue.resolution && <AppText>{issue.resolution}</AppText>}
      {draft ? (
        <>
          <MobileInput
            accessibilityLabel={copy("Issue title", "عنوان المشكلة")}
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
            maxLength={240}
          />
          <MobileInput
            accessibilityLabel={copy("Description", "الوصف")}
            value={draft.description}
            onChangeText={(description) => setDraft({ ...draft, description })}
            maxLength={10000}
            multiline
          />
          <SegmentedControl
            accessibilityLabel={copy("Status", "الحالة")}
            value={draft.status}
            options={statuses}
            onChange={(status) => setDraft({ ...draft, status: status as ProjectIssueStatus })}
          />
          {draft.status === "RESOLVED" && (
            <MobileInput
              accessibilityLabel={copy("Resolution", "الحل")}
              value={draft.resolution}
              onChangeText={(resolution) => setDraft({ ...draft, resolution })}
              maxLength={10000}
              multiline
            />
          )}
          {draft.revision !== issue.revision && (
            <AppText accessibilityRole="alert">
              {copy("The issue changed. Reopen the editor.", "تغيّرت المشكلة. افتح المحرر مجدداً.")}
            </AppText>
          )}
          <Button
            title={copy("Cancel", "إلغاء")}
            variant="ghost"
            onPress={() => setDraft(undefined)}
          />
          <Button
            title={copy("Save issue", "حفظ المشكلة")}
            disabled={
              workspace.saving ||
              draft.revision !== issue.revision ||
              !draft.title.trim() ||
              (draft.status === "RESOLVED" && !draft.resolution.trim())
            }
            onPress={async () => {
              if (await workspace.updateIssue(draft)) setDraft(undefined);
            }}
          />
        </>
      ) : (
        <Button
          title={copy("Edit issue", "تعديل المشكلة")}
          variant="ghost"
          onPress={() => setDraft(issue)}
        />
      )}
    </View>
  );
}

export function LiveProjectIssues() {
  const copy = useCopy();
  const { project, addIssue, saving, error, loading, retryLoading } = useProjectWorkspace();
  const [title, setTitle] = useState("");
  return (
    <Panel title={copy("Project issues", "مشكلات المشروع")}>
      {loading && <AppText>{copy("Loading project…", "جارٍ تحميل المشروع…")}</AppText>}
      {!!error && <AppText accessibilityRole="alert">{error}</AppText>}
      {(project || error) && (
        <Button
          variant="ghost"
          disabled={saving}
          title={copy("Refresh project", "تحديث المشروع")}
          onPress={() => void retryLoading()}
        />
      )}
      {project && (
        <>
          <MobileInput
            accessibilityLabel={copy("Issue title", "عنوان المشكلة")}
            value={title}
            onChangeText={setTitle}
            maxLength={240}
          />
          <Button
            title={copy("Add issue", "إضافة مشكلة")}
            disabled={saving || !title.trim()}
            onPress={async () => {
              if (await addIssue(title.trim())) setTitle("");
            }}
          />
          {project.issues.map((issue) => (
            <NativeProjectIssue key={issue.id} issue={issue} />
          ))}
        </>
      )}
    </Panel>
  );
}
