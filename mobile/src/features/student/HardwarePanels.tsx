import { useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { projectFor, type Circuit } from "@/domain/workspace";
import { checkWireFit, translatedWireFit } from "@/lib/hardware/wireCompatibility";
import { CATALOG_MAP } from "@/lib/hardware/catalog";
import { WIRE_TYPES, type WireType } from "@/lib/hardware/types";
import { LabView } from "@/components/LabView";
import hardware from "../../../assets/data/hardware.json";
import { colors } from "@/theme";
export { LabView } from "@/components/LabView";

type Nodes = Circuit["versions"][number]["nodes"];
type Wires = Circuit["versions"][number]["wires"];
export { CatalogPanel } from "./StudentCatalog";
export function CircuitLabPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const project = projectFor(state, actorId);
  const [name, setName] = useState("My circuit");
  const [id, setId] = useState<string | undefined>();
  const [nodes, setNodes] = useState<Nodes>([
    { model: "arduino-uno", x: -3, z: 0 },
    { model: "led-red", x: 3, z: 0 },
    { model: "resistor-220", x: 1, z: 2 },
  ]);
  const [wires, setWires] = useState<Wires>([]);
  const [search, setSearch] = useState("");
  const [part, setPart] = useState("0");
  const [from, setFrom] = useState("0");
  const [to, setTo] = useState("1");
  const [fromPin, setFromPin] = useState("0");
  const [toPin, setToPin] = useState("0");
  const [wireKind, setWireKind] = useState("power");
  const [color, setColor] = useState("#e5484d");
  const [notice, setNotice] = useState("");
  const [full, setFull] = useState(false);
  const [fullHeight, setFullHeight] = useState(300);
  const [tab, setTab] = useState("editor");
  const [version, setVersion] = useState("");
  const circuit = state.circuits.find((c) => c.id === id);
  const available = state.circuits.filter(
    (c) => c.ownerId === actorId || (c.shared && c.projectId === project?.id),
  );
  const library = state.circuits.filter(
    (c) =>
      c.published !== "private" &&
      `${c.name} ${state.users.find((u) => u.id === c.ownerId)?.name} ${state.projects.find((p) => p.id === c.projectId)?.title} ${c.versions
        .at(-1)
        ?.nodes.map((n) => CATALOG_MAP[n.model]?.name)
        .join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function connect() {
    const a = Number(from),
      b = Number(to),
      ap = Number(fromPin),
      bp = Number(toPin);
    if (!nodes[a] || !nodes[b] || (a === b && ap === bp)) return;
    const data = {
      parts: nodes.map((n, i) => ({ id: String(i), type: n.model, x: n.x, z: n.z, rot: 0 })),
      wires: [],
    };
    const fit = checkWireFit(
      data,
      { partId: String(a), pin: ap },
      { partId: String(b), pin: bp },
      wireKind as WireType,
    );
    const translated = translatedWireFit(fit, t("en", "ar") as "en" | "ar");
    setNotice(`${translated.title} · ${translated.message}`);
    if (fit.ok)
      setWires((old) => [
        ...old,
        { from: a, fromPin: ap, to: b, toPin: bp, color, kind: wireKind },
      ]);
  }
  function save() {
    if (act({ type: "circuit.save", id, name, nodes, wires })) {
      if (!id) {
        setNotice(
          t(
            "Circuit saved. Open it from Saved circuits to continue editing.",
            "حُفظت الدارة. افتحها من الدارات المحفوظة لمتابعة تعديلها.",
          ),
        );
        setTab("saved");
      } else setNotice(t("New version saved", "تم حفظ نسخة جديدة"));
    }
  }
  return (
    <View style={kit.stack}>
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { id: "editor", label: t("Workbench", "مساحة العمل") },
          { id: "saved", label: t("Saved circuits", "الدارات المحفوظة") },
          { id: "library", label: t("Student library", "مكتبة الطلاب") },
        ]}
      />
      {tab === "editor" ? (
        <>
          <Field label={t("Circuit name", "اسم الدارة")} value={name} onChangeText={setName} />
          <LabView nodes={nodes} wires={wires} />
          <AppText variant="caption" tone="muted">
            {t(
              "Drag to orbit. Pinch to zoom. Structural 3D preview; no electrical simulation runs here.",
              "اسحب للدوران وكبّر بإصبعين. معاينة ثلاثية الأبعاد؛ لا توجد محاكاة كهربائية هنا.",
            )}
          </AppText>
          <View style={kit.wrap}>
            <Button
              title={t("Full screen", "ملء الشاشة")}
              variant="soft"
              onPress={() => setFull(true)}
            />
            <Button title={t("Save version", "حفظ نسخة")} onPress={save} />
            <Button
              title={t("New circuit", "دارة جديدة")}
              variant="ghost"
              onPress={() => {
                setId(undefined);
                setName("My circuit");
                setNodes([]);
                setWires([]);
              }}
            />
          </View>
          <Panel title={t("Add a component", "إضافة قطعة")}>
            <Field
              label={t("Search models", "البحث في الموديلات")}
              value={search}
              onChangeText={setSearch}
            />
            <Chips
              value=""
              onChange={(model) => {
                if (nodes.length < 20)
                  setNodes((old) => [
                    ...old,
                    { model, x: (old.length % 4) * 3 - 4, z: Math.floor(old.length / 4) * 4 },
                  ]);
              }}
              options={hardware.models
                .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
                .slice(0, search ? 12 : 6)
                .map((m) => ({ id: m.id, label: m.name }))}
            />
          </Panel>
          {!!nodes.length && (
            <Panel title={t("Position component", "تحريك القطعة")}>
              <Chips
                value={part}
                onChange={setPart}
                options={nodes.map((n, i) => ({
                  id: String(i),
                  label: `${i + 1}. ${CATALOG_MAP[n.model].name}`,
                }))}
              />
              <View style={kit.wrap}>
                {[
                  { label: "←", x: -0.5, z: 0 },
                  { label: "→", x: 0.5, z: 0 },
                  { label: "↑", x: 0, z: -0.5 },
                  { label: "↓", x: 0, z: 0.5 },
                ].map((move) => (
                  <Button
                    key={move.label}
                    title={move.label}
                    variant="soft"
                    onPress={() =>
                      setNodes((old) =>
                        old.map((n, i) =>
                          i === Number(part) ? { ...n, x: n.x + move.x, z: n.z + move.z } : n,
                        ),
                      )
                    }
                  />
                ))}
                <Button
                  title={t("Remove", "إزالة")}
                  variant="danger"
                  onPress={() => {
                    const i = Number(part);
                    setNodes((old) => old.filter((_, j) => i !== j));
                    setWires((old) =>
                      old
                        .filter((w) => w.from !== i && w.to !== i)
                        .map((w) => ({
                          ...w,
                          from: w.from > i ? w.from - 1 : w.from,
                          to: w.to > i ? w.to - 1 : w.to,
                        })),
                    );
                    setPart("0");
                  }}
                />
              </View>
            </Panel>
          )}
          {nodes.length > 1 && (
            <Panel title={t("Connect a wire", "توصيل سلك")}>
              <AppText>{t("From component", "من القطعة")}</AppText>
              <Chips
                value={from}
                onChange={(v) => {
                  setFrom(v);
                  setFromPin("0");
                }}
                options={nodes.map((n, i) => ({
                  id: String(i),
                  label: `${i + 1}. ${CATALOG_MAP[n.model].name}`,
                }))}
              />
              <Chips
                value={fromPin}
                onChange={setFromPin}
                options={(CATALOG_MAP[nodes[Number(from)]?.model]?.pins ?? [])
                  .slice(0, 90)
                  .map((p, i) => ({ id: String(i), label: p.name }))}
              />
              <AppText>{t("To component", "إلى القطعة")}</AppText>
              <Chips
                value={to}
                onChange={(v) => {
                  setTo(v);
                  setToPin("0");
                }}
                options={nodes.map((n, i) => ({
                  id: String(i),
                  label: `${i + 1}. ${CATALOG_MAP[n.model].name}`,
                }))}
              />
              <Chips
                value={toPin}
                onChange={setToPin}
                options={(CATALOG_MAP[nodes[Number(to)]?.model]?.pins ?? [])
                  .slice(0, 90)
                  .map((p, i) => ({ id: String(i), label: p.name }))}
              />
              <Chips
                value={wireKind}
                onChange={setWireKind}
                options={WIRE_TYPES.map((w) => ({ id: w.value, label: w.label }))}
              />
              <Chips
                value={color}
                onChange={setColor}
                options={["#e5484d", "#2b2f33", "#12a594", "#3e9bf0", "#8e4ec6"].map((c) => ({
                  id: c,
                  label: c,
                }))}
              />
              <Button title={t("Connect", "توصيل")} onPress={connect} />
              <AppText>
                {wires.length} {t("wires", "أسلاك")}
              </AppText>
              <Button
                title={t("Remove last wire", "إزالة آخر سلك")}
                disabled={!wires.length}
                variant="ghost"
                onPress={() => setWires((old) => old.slice(0, -1))}
              />
            </Panel>
          )}
          {notice && (
            <Panel>
              <AppText>{notice}</AppText>
            </Panel>
          )}
        </>
      ) : (
        <>
          <Field
            label={t("Search student, project or component", "ابحث بالطالب أو المشروع أو القطعة")}
            value={search}
            onChangeText={setSearch}
          />
          {(tab === "saved" ? available : library).map((c) => (
            <Panel key={c.id}>
              <AppText variant="heading">{c.name}</AppText>
              <AppText tone="muted">
                {state.users.find((u) => u.id === c.ownerId)?.name} · {c.versions.length}{" "}
                {t("versions", "نسخ")}
              </AppText>
              <Button
                title={t("Open latest version", "فتح آخر نسخة")}
                variant="soft"
                onPress={() => {
                  const v = (
                    tab === "library"
                      ? c.versions.find((v) => v.id === c.publishedVersionId)
                      : c.versions.at(-1)
                  )!;
                  setId(c.id);
                  setName(c.name);
                  setNodes(v.nodes);
                  setWires(v.wires);
                  setTab("editor");
                  setNotice("");
                }}
              />
              {c.ownerId === actorId && (
                <>
                  <Button
                    title={
                      c.shared
                        ? t("Make private to you", "خاصة بك")
                        : t("Share with team", "مشاركة مع الفريق")
                    }
                    variant="ghost"
                    onPress={() =>
                      act({
                        type: "circuit.share",
                        id: c.id,
                        shared: !c.shared,
                        published: c.published,
                      })
                    }
                  />
                  <Chips
                    value={c.published}
                    onChange={(published) =>
                      act({
                        type: "circuit.share",
                        id: c.id,
                        shared: c.shared,
                        published: published as Circuit["published"],
                      })
                    }
                    options={[
                      { id: "private", label: t("Private", "خاصة") },
                      { id: "view", label: t("Publish: view only", "نشر للمشاهدة") },
                      { id: "copy", label: t("Publish: allow copies", "نشر مع السماح بالنسخ") },
                    ]}
                  />
                </>
              )}
              {c.ownerId !== actorId && c.published === "copy" && (
                <Button
                  title={t("Create your own copy", "إنشاء نسخة خاصة")}
                  onPress={() => act({ type: "circuit.copy", id: c.id })}
                />
              )}
            </Panel>
          ))}
        </>
      )}
      {circuit && tab === "editor" && (
        <Panel title={t("Version history", "النسخ المحفوظة")}>
          <Chips
            value={version}
            onChange={(v) => {
              setVersion(v);
              const snapshot = circuit.versions.find((x) => x.id === v)!;
              setNodes(snapshot.nodes);
              setWires(snapshot.wires);
            }}
            options={circuit.versions.map((v, i) => ({
              id: v.id,
              label: `${i + 1} · ${new Date(v.createdAt).toLocaleTimeString()}`,
            }))}
          />
        </Panel>
      )}
      <Modal visible={full} presentationStyle="fullScreen" onRequestClose={() => setFull(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <Button
            title={t("Close full screen", "إغلاق ملء الشاشة")}
            variant="soft"
            onPress={() => setFull(false)}
          />
          <View
            style={{ flex: 1 }}
            onLayout={(event) => setFullHeight(event.nativeEvent.layout.height)}
          >
            <LabView nodes={nodes} wires={wires} height={fullHeight} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
