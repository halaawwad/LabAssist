import { ReportsPanel } from "@/features/shared/ReportsPanel";
import { router } from "./router";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppText, Button } from "@/components";
import { Panel, Ring, kit } from "@/components/MobileKit";
import { ProjectPhoto } from "@/components/ProjectPhoto";
import { project, projectBom, useProjectWorkspace } from "./StudentReference";

export function ReferenceProject({ initial = "Overview" }: { initial?: string }) {
  const workspace = useProjectWorkspace();
  const [tab, setTab] = useState(initial),
    [edit, setEdit] = useState(false),
    [issue, setIssue] = useState("");
  const [titleDraft, setTitleDraft] = useState(workspace.details.title);
  const [abstractDraft, setAbstractDraft] = useState(workspace.abstract);
  return (
    <View style={kit.stack}>
      {!!workspace.error && (
        <Panel>
          <AppText accessibilityRole="alert">{workspace.error}</AppText>
          <Button title="Retry loading" onPress={workspace.retryLoading} />
        </Panel>
      )}
      <Panel>
        <AppText tone="primary">{project.status}</AppText>
        <AppText variant="title">{workspace.details.title}</AppText>
        <AppText tone="muted">{project.subtitle}</AppText>
        <AppText variant="caption">{project.deadline} · 3 teammates</AppText>
        <AppText weight="bold">{workspace.progress}% overall progress</AppText>
        <AppText variant="caption" tone="muted">
          {workspace.completedCount} of {workspace.taskCount} tasks complete
        </AppText>
        <View style={{ height: 5, backgroundColor: "#e0e8d7", borderRadius: 4 }}>
          <View
            style={{
              height: 5,
              width: `${workspace.progress}%`,
              backgroundColor: "#8ba56d",
              borderRadius: 4,
            }}
          />
        </View>
        <View style={kit.row}>
          <Button title="Weekly report" size="sm" onPress={() => setTab("Reports")} />
          <Button
            title="Add issue"
            size="sm"
            variant="soft"
            onPress={() => {
              setTab("Overview");
              setEdit(true);
            }}
          />
        </View>
        <ProjectPhoto projectId="reference-smart-car" />
      </Panel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {["Overview", "Team & Tasks", "Components", "Reports"].map((name) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            onPress={() => setTab(name)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 17,
              borderRadius: 18,
              backgroundColor: tab === name ? "#526443" : "#fffffff0",
            }}
          >
            <AppText style={{ fontSize: 13, color: tab === name ? "#fff" : "#526443" }}>
              {name}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      {tab === "Overview" && (
        <>
          <Panel title="Project abstract">
            <AppText>{workspace.abstract}</AppText>
            <Button
              title={edit ? "Close editor" : "Edit abstract"}
              variant="ghost"
              onPress={() => {
                if (!edit) {
                  setTitleDraft(workspace.details.title);
                  setAbstractDraft(workspace.abstract);
                }
                setEdit(!edit);
              }}
            />
            {edit && (
              <View style={kit.stack}>
                <TextInput
                  accessibilityLabel="Project title"
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                />
                <TextInput
                  accessibilityLabel="Project abstract"
                  multiline
                  value={abstractDraft}
                  onChangeText={setAbstractDraft}
                  style={{
                    minHeight: 150,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#cad6bf",
                    borderRadius: 14,
                    fontSize: 15,
                  }}
                />
                <Button
                  title="Save project details"
                  disabled={workspace.saving || !titleDraft.trim() || !abstractDraft.trim()}
                  onPress={async () => {
                    if (await workspace.saveDetails(titleDraft, abstractDraft)) setEdit(false);
                  }}
                />
              </View>
            )}
          </Panel>
          <Panel title="Current milestone">
            <AppText variant="heading">Prototype testing</AppText>
            <AppText tone="muted">
              Milestone {project.milestone} of {project.milestoneCount}
            </AppText>
          </Panel>
          <Panel title="Open issues">
            <AppText>Distance sensor needs calibration</AppText>
            <AppText>Motor response under load needs testing</AppText>
            <AppText>Power consumption needs review</AppText>
            {workspace.issues.map((x, i) => (
              <AppText key={`${i}-${x}`}>{x}</AppText>
            ))}
            <TextInput
              accessibilityLabel="Issue description"
              placeholder="Describe the issue"
              value={issue}
              onChangeText={setIssue}
              style={{
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#cad6bf",
                fontSize: 16,
              }}
            />
            <Button
              title="Add issue"
              disabled={!issue.trim()}
              onPress={async () => {
                if (await workspace.addIssue(issue.trim())) setIssue("");
              }}
            />
          </Panel>
          <Panel title="Budget health">
            <AppText variant="title">${project.budget - project.spent}</AppText>
            <AppText>still available</AppText>
            <Ring value={Math.round((project.spent / project.budget) * 100)} />
            <AppText>
              Spent ${project.spent} · Remaining ${project.budget - project.spent}
            </AppText>
            <AppText variant="caption" tone="muted">
              Total project budget: ${project.budget}. Recorded expenses across the project.
            </AppText>
          </Panel>
        </>
      )}
      {tab === "Team & Tasks" && <Button title="Add task" variant="soft" onPress={() => router.push("/native/student/tasks")} />}
      {tab === "Team & Tasks" &&
        workspace.members.map((member, index) => (
          <Panel key={member.name} title={member.name}>
            <AppText variant="caption" tone="muted">
              Computer Engineering
            </AppText>
            <Ring
              value={Math.round(
                (workspace.teamTasks.filter(
                  (task) => task.owner === index && workspace.completed.includes(task.id),
                ).length /
                  Math.max(1, workspace.teamTasks.filter((task) => task.owner === index).length)) *
                  100,
              )}
              color={["#839b68", "#709ab8", "#bc9368"][index]}
            />
            <AppText weight="semibold">Personal progress</AppText>
            <AppText variant="caption">
              {
                workspace.teamTasks.filter(
                  (task) => task.owner === index && workspace.completed.includes(task.id),
                ).length
              }{" "}
              of {workspace.teamTasks.filter((task) => task.owner === index).length} tasks complete
            </AppText>
            <AppText weight="semibold">Today’s Tasks</AppText>
            {workspace.teamTasks
              .filter((x) => x.owner === index)
              .map((task) => {
                const done = workspace.completed.includes(task.id);
                return (
                  <Pressable
                    key={task.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: done,
                      disabled: member.id !== workspace.actorId,
                    }}
                    disabled={member.id !== workspace.actorId}
                    onPress={async () => {
                      if (!(await workspace.toggleTask(task.id))) return;
                      workspace.logTeamActivity(
                        index,
                        `${done ? "Reopened" : "Completed"} “${task.title}”`,
                      );
                    }}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: "#e5e9df",
                      gap: 5,
                    }}
                  >
                    <AppText>
                      {done ? "✓" : "○"} {task.title}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {task.description}
                    </AppText>
                    <AppText variant="caption">
                      {task.due} ·{" "}
                      {done ? "Completed" : task.inProgress ? "In progress" : "Remaining"}
                    </AppText>
                  </Pressable>
                );
              })}
            <AppText variant="caption" tone="muted">
              Last activity:{" "}
              {workspace.teamActivity.find((x) => x.owner === index)?.text ?? "No recent activity"}
            </AppText>
          </Panel>
        ))}
      {tab === "Components" && (
        <>
          <Panel title="Build readiness">
            <Ring value={40} />
            <AppText weight="semibold">2 / 5 units available</AppText>
            <AppText tone="muted">3 units still needed for the listed build.</AppText>
          </Panel>
          <Panel title="Bill of Materials">
            {projectBom.map((part) => (
              <View
                key={part.name}
                style={{
                  gap: 5,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: "#e5e9df",
                }}
              >
                <AppText weight="semibold">{part.name}</AppText>
                <AppText variant="caption">
                  Quantity {part.quantity} · ${part.cost} ·{" "}
                  {part.available ? "Available" : "Still needed"}
                </AppText>
              </View>
            ))}
          </Panel>
          <Panel title="Budget health">
            <AppText>Spent ${project.spent}</AppText>
            <AppText>Remaining ${project.budget - project.spent}</AppText>
            <AppText>Total project budget: ${project.budget}</AppText>
          </Panel>
        </>
      )}
      {tab === "Reports" && <ReportsPanel />}
    </View>
  );
}
