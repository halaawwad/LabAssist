import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, Ring, kit, useCopy } from "@/components/MobileKit";
import { TeamPanels } from "./AccountPanels";
import { ReportsPanel } from "./ReportsPanel";
import { ProjectPhoto } from "@/components/ProjectPhoto";
import { projectFor, projectProgress, type Project } from "@/domain/workspace";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors } from "@/theme";

export function TasksPanel({ readonly = false }: { readonly?: boolean }) {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const projects = state.projects.filter((p) =>
    readonly ? p.supervisorIds.includes(actorId) : p.studentIds.includes(actorId),
  );
  const [team, setTeam] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(actorId);
  const p = projects.find((p) => p.id === team);
  return (
    <View style={kit.stack}>
      {readonly && (
        <Chips
          value={team}
          onChange={setTeam}
          options={projects.map((p) => ({ id: p.id, label: p.title }))}
        />
      )}
      <Panel tint={colors.primaryWash}>
        <AppText variant="heading">{p?.title}</AppText>
        <AppText tone="muted">
          {t(
            "Everyone sees the plan. Each student updates their own tasks.",
            "الكل يرى الخطة. كل طالب يؤكد إنجاز مهامه بنفسه.",
          )}
        </AppText>
      </Panel>
      {!readonly && p && (
        <Panel>
          <Field label={t("New task", "مهمة جديدة")} value={title} onChangeText={setTitle} />
          <Chips
            value={owner}
            onChange={setOwner}
            options={p.studentIds.map((id) => ({
              id,
              label: state.users.find((u) => u.id === id)!.name,
            }))}
          />
          <Button
            title={t("Add task", "إضافة المهمة")}
            disabled={!title.trim()}
            onPress={() => {
              if (act({ type: "task.add", projectId: p.id, title, ownerId: owner })) setTitle("");
            }}
          />
        </Panel>
      )}
      {state.tasks
        .filter((task) => task.projectId === team)
        .map((task) => (
          <Pressable
            key={task.id}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: task.done,
              disabled: readonly || task.ownerId !== actorId,
            }}
            disabled={readonly || task.ownerId !== actorId}
            onPress={() => act({ type: "task.toggle", id: task.id })}
          >
            <Panel tint={task.done ? colors.primaryWash : undefined}>
              <AppText weight="semibold">
                {task.done ? "✓" : "○"} {task.title}
              </AppText>
              <AppText variant="caption" tone="muted">
                {state.users.find((u) => u.id === task.ownerId)?.name} ·{" "}
                {task.done ? t("Completed", "مكتملة") : t("To do", "متبقية")}
              </AppText>
            </Panel>
          </Pressable>
        ))}
    </View>
  );
}
export function IssuesPanel({ readonly = false }: { readonly?: boolean }) {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const projects = state.projects.filter((p) =>
    readonly ? p.supervisorIds.includes(actorId) : p.studentIds.includes(actorId),
  );
  const [team, setTeam] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  return (
    <View style={kit.stack}>
      {readonly && (
        <Chips
          value={team}
          onChange={setTeam}
          options={projects.map((p) => ({ id: p.id, label: p.title }))}
        />
      )}{" "}
      {!readonly && (
        <Panel>
          <Field
            label={t("Describe an issue", "وصف المشكلة")}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          <Button
            title={t("Add issue", "إضافة المشكلة")}
            disabled={!title.trim()}
            onPress={() => {
              if (act({ type: "issue.add", projectId: team, title })) setTitle("");
            }}
          />
        </Panel>
      )}
      {state.issues
        .filter((i) => i.projectId === team)
        .map((i) => (
          <Panel key={i.id} tint={i.resolved ? colors.primaryWash : colors.softRose}>
            <AppText variant="heading">{i.title}</AppText>
            <AppText>{i.resolved ? t("Resolved", "تم الحل") : t("Open", "مفتوحة")}</AppText>
            {!readonly && (
              <Button
                title={i.resolved ? t("Reopen", "إعادة فتح") : t("Mark resolved", "تم حل المشكلة")}
                variant="soft"
                onPress={() => act({ type: "issue.toggle", id: i.id })}
              />
            )}
          </Panel>
        ))}
    </View>
  );
}
export function FinancePanel({ parts = false }: { parts?: boolean }) {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const p = projectFor(state, actorId);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [budget, setBudget] = useState(String(p?.budget ?? 250));
  if (!p) return null;
  const spent = state.expenses
    .filter((e) => e.projectId === p.id)
    .reduce((sum, e) => sum + e.amount, 0);
  return (
    <View style={kit.stack}>
      <Panel tint={colors.softBlue}>
        <Field
          label={t("Budget (ILS)", "الميزانية (شيكل)")}
          value={budget}
          onChangeText={setBudget}
          keyboardType="decimal-pad"
        />
        <Button
          title={t("Update budget", "تعديل الميزانية")}
          variant="ghost"
          onPress={() => act({ type: "budget.set", projectId: p.id, amount: Number(budget) })}
        />
        <AppText variant="heading">{t("Project budget", "ميزانية المشروع")}</AppText>
        <AppText variant="title">₪{(p.budget - spent).toFixed(2)}</AppText>
        <AppText tone="muted">
          {t(
            `Available · ₪${spent.toFixed(2)} spent / ₪${p.budget}`,
            `المتبقي · المصروف ₪${spent.toFixed(2)} / ₪${p.budget}`,
          )}
        </AppText>
        <AppText variant="caption">
          {t("All amounts in this demo use ILS.", "جميع مبالغ هذه المعاينة بالشيكل.")}
        </AppText>
      </Panel>
      <Panel>
        <Field
          label={parts ? t("Part name", "اسم القطعة") : t("Expense description", "وصف المصروف")}
          value={name}
          onChangeText={setName}
        />
        {parts && (
          <Field
            label={t("Quantity", "الكمية")}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
        )}
        <Field
          label={
            parts
              ? t("Estimated unit price (ILS)", "السعر التقديري للوحدة (شيكل)")
              : t("Amount (ILS)", "المبلغ (شيكل)")
          }
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <Button
          title={t("Add", "إضافة")}
          disabled={!name.trim() || !amount}
          onPress={() => {
            if (
              act(
                parts
                  ? {
                      type: "part.add",
                      projectId: p.id,
                      name,
                      quantity: Number(quantity),
                      unitPrice: Number(amount),
                    }
                  : { type: "expense.add", projectId: p.id, title: name, amount: Number(amount) },
              )
            ) {
              setName("");
              setAmount("");
            }
          }}
        />
      </Panel>
      {parts
        ? state.parts
            .filter((part) => part.projectId === p.id)
            .map((part) => (
              <Panel key={part.id}>
                <AppText variant="heading">{part.name}</AppText>
                <AppText>
                  {part.quantity} × ₪{part.unitPrice.toFixed(2)}
                </AppText>
                <Chips
                  value={part.status}
                  onChange={(status) =>
                    act({ type: "part.status", id: part.id, status: status as typeof part.status })
                  }
                  options={[
                    { id: "needed", label: t("Needed", "مطلوبة") },
                    { id: "obtained", label: t("Obtained", "تم توفيرها") },
                    { id: "unused", label: t("Not needed", "لم تلزمنا") },
                  ]}
                />
                <PartEstimate id={part.id} />
              </Panel>
            ))
        : state.expenses
            .filter((e) => e.projectId === p.id)
            .map((e) => (
              <Panel key={e.id}>
                <AppText weight="semibold">{e.title}</AppText>
                <AppText>₪{e.amount.toFixed(2)}</AppText>
              </Panel>
            ))}
    </View>
  );
}
function PartEstimate({ id }: { id: string }) {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const p = state.parts.find((p) => p.id === id)!;
  const [edit, setEdit] = useState(false);
  const [quantity, setQuantity] = useState(String(p.quantity));
  const [price, setPrice] = useState(String(p.unitPrice));
  return (
    <View style={kit.stack}>
      <Button
        title={t("Edit estimate", "تعديل التقدير")}
        variant="ghost"
        onPress={() => setEdit(!edit)}
      />
      {edit && (
        <>
          <Field
            label={t("Quantity", "الكمية")}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
          <Field
            label={t("Unit price (ILS)", "سعر الوحدة (شيكل)")}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <Button
            title={t("Save estimate", "حفظ التقدير")}
            onPress={() => {
              if (
                act({
                  type: "part.update",
                  id,
                  quantity: Number(quantity),
                  unitPrice: Number(price),
                })
              )
                setEdit(false);
            }}
          />
        </>
      )}
    </View>
  );
}
export function ProjectDetails({
  project,
  supervisor = false,
}: {
  project: Project;
  supervisor?: boolean;
}) {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [tab, setTab] = useState("overview");
  return (
    <View style={kit.stack}>
      <Panel tint={colors.primaryWash}>
        <AppText variant="title">{project.title}</AppText>
        <AppText>{project.description}</AppText>
        <ProjectPhoto key={project.id} projectId={project.id} />
        <View style={kit.row}>
          <Ring value={projectProgress(state, project.id)} />
          <View style={kit.grow}>
            <AppText>{t("Task completion", "إنجاز المهام")}</AppText>
            <AppText tone="muted">
              {t("Table", "الطاولة")}: {project.table || t("Not assigned", "لم تعيّن")}
            </AppText>
          </View>
        </View>
      </Panel>
      {!supervisor && (
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { id: "overview", label: t("Overview", "نظرة عامة") },
            { id: "team", label: t("Team & Tasks", "الفريق والمهام") },
            { id: "components", label: t("Components", "القطع") },
            { id: "reports", label: t("Reports", "التقارير") },
          ]}
        />
      )}
      {!supervisor && tab === "team" && (
        <>
          <TeamPanels />
          <TasksPanel />
        </>
      )}
      {!supervisor && tab === "components" && (
        <>
          <FinancePanel parts />
          <FinancePanel />
        </>
      )}
      {!supervisor && tab === "reports" && <ReportsPanel />}
      {!supervisor && tab === "overview" && <IssuesPanel />}
      {!supervisor && tab === "overview" && (
        <>
          <Button
            title={
              edit
                ? t("Close editor", "إغلاق التعديل")
                : t("Edit project details", "تعديل بيانات المشروع")
            }
            variant="soft"
            onPress={() => setEdit(!edit)}
          />
          {edit && (
            <Panel>
              <Field
                label={t("Project name", "اسم المشروع")}
                value={title}
                onChangeText={setTitle}
              />
              <Field
                label={t("Description", "الوصف")}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Button
                title={t("Save", "حفظ")}
                onPress={() => {
                  if (act({ type: "project.edit", id: project.id, title, description }))
                    setEdit(false);
                }}
              />
            </Panel>
          )}
        </>
      )}
      <Panel title={t("Team & supervisors", "الفريق والمشرفون")}>
        {[...project.studentIds, ...project.supervisorIds].map((id) => (
          <AppText key={id}>{state.users.find((u) => u.id === id)?.name}</AppText>
        ))}
      </Panel>
      {supervisor && (
        <Panel title={t("Submission windows", "فتح التسليم")}>
          <View style={kit.row}>
            <AppText style={kit.grow}>{t("Final report", "التقرير النهائي")}</AppText>
            <Switch
              value={project.finalOpen}
              onValueChange={(open) => {
                act({ type: "project.gate", id: project.id, kind: "final", open });
              }}
            />
          </View>
          <View style={kit.row}>
            <AppText style={kit.grow}>{t("Presentation", "العرض التقديمي")}</AppText>
            <Switch
              value={project.presentationOpen}
              onValueChange={(open) => {
                act({ type: "project.gate", id: project.id, kind: "presentation", open });
              }}
            />
          </View>
        </Panel>
      )}
    </View>
  );
}
export function SupervisorProjectsPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const projects = state.projects.filter((p) => p.supervisorIds.includes(actorId));
  const [selected, setSelected] = useState("");
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [students, setStudents] = useState([
    { name: "", number: "" },
    { name: "", number: "" },
  ]);
  return (
    <View style={kit.stack}>
      <Button
        title={create ? t("Close", "إغلاق") : t("Register a new team", "تسجيل فريق جديد")}
        variant="soft"
        onPress={() => setCreate(!create)}
      />
      {create && (
        <Panel>
          <Field
            label={t("Project working title", "عنوان مبدئي للمشروع")}
            value={title}
            onChangeText={setTitle}
          />
          {students.map((u, i) => (
            <View key={i} style={kit.stack}>
              <Field
                label={t(`Student ${i + 1} name`, `اسم الطالب ${i + 1}`)}
                value={u.name}
                onChangeText={(name) =>
                  setStudents((s) => s.map((u, j) => (j === i ? { ...u, name } : u)))
                }
              />
              <Field
                label={t("University number (8 digits)", "الرقم الجامعي (8 خانات)")}
                value={u.number}
                onChangeText={(number) =>
                  setStudents((s) => s.map((u, j) => (j === i ? { ...u, number } : u)))
                }
                keyboardType="number-pad"
                maxLength={8}
              />
            </View>
          ))}
          <Button
            title={
              students.length === 2
                ? t("Add third student", "إضافة طالب ثالث")
                : t("Remove third student", "إزالة الطالب الثالث")
            }
            variant="ghost"
            onPress={() =>
              setStudents((s) =>
                s.length === 2 ? [...s, { name: "", number: "" }] : s.slice(0, 2),
              )
            }
          />
          <AppText variant="caption" tone="muted">
            {t(
              "Creates sample accounts and the shared team conversation on this device. Activation emails require the backend.",
              "ينشئ حسابات تجريبية ومحادثة الفريق على هذا الجهاز. إرسال التفعيل يحتاج الباك.",
            )}
          </AppText>
          <Button
            title={t("Save team", "حفظ الفريق")}
            onPress={() => {
              if (act({ type: "project.create", title, students })) {
                setCreate(false);
                setTitle("");
                setStudents([
                  { name: "", number: "" },
                  { name: "", number: "" },
                ]);
              }
            }}
          />
        </Panel>
      )}
      <Chips
        value={selected}
        onChange={setSelected}
        options={projects.map((p) => ({ id: p.id, label: p.title }))}
      />
      {selected ? (
        <ProjectDetails
          key={selected}
          project={projects.find((p) => p.id === selected)!}
          supervisor
        />
      ) : (
        projects.map((p) => (
          <Pressable key={p.id} onPress={() => setSelected(p.id)}>
            <Panel>
              <AppText variant="heading">{p.title}</AppText>
              <View style={kit.row}>
                <Ring value={projectProgress(state, p.id)} />
                <AppText>
                  {p.studentIds.length} {t("students", "طلاب")}
                </AppText>
              </View>
            </Panel>
          </Pressable>
        ))
      )}
    </View>
  );
}
