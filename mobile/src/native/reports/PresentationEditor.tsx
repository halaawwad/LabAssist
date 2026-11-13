import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import {
  starterDeck,
  newSlide,
  slideTips,
  themes,
  layouts,
  validDeck,
  type Deck,
  type Slide,
} from "@/domain/presentation/presentations";
import { templates } from "@/domain/presentation/presentationTemplates";
import {
  slideScene,
  patchSlideObject,
  type ObjectPatch,
} from "@/domain/presentation/presentationScene";
import type { Report } from "@/domain/workspace";
import DeckEngine from "./DeckEngine";
import type { DeckEngineProps, DeckEngineReply } from "./deckEngineTypes";

function SlidePage({
  deck,
  index,
  width,
  onSelect,
  onMove,
  selected,
}: {
  deck: Deck;
  index: number;
  width: number;
  onSelect?: (id: string) => void;
  onMove?: (id: string, patch: ObjectPatch) => void;
  selected?: string;
}) {
  const scene = slideScene(deck, deck.slides[index], index),
    scale = width / 960;
  const gesture = useRef({ x: 0, y: 0, left: 0, top: 0 });
  return (
    <View
      style={{
        width,
        height: scene.height * scale,
        backgroundColor: scene.background,
        overflow: "hidden",
        borderRadius: 4,
      }}
    >
      {scene.objects.map((o) => (
        <View
          key={o.id}
          onStartShouldSetResponder={() => !!onMove && !o.locked}
          onResponderGrant={(e) => {
            onSelect?.(o.id);
            gesture.current = {
              x: e.nativeEvent.pageX,
              y: e.nativeEvent.pageY,
              left: o.x,
              top: o.y,
            };
          }}
          onResponderMove={(e) =>
            onMove?.(o.id, {
              x: Math.max(
                0,
                Math.min(
                  960 - o.w,
                  gesture.current.left + (e.nativeEvent.pageX - gesture.current.x) / scale,
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  scene.height - o.h,
                  gesture.current.top + (e.nativeEvent.pageY - gesture.current.y) / scale,
                ),
              ),
            })
          }
          style={{
            position: "absolute",
            left: o.x * scale,
            top: o.y * scale,
            width: o.w * scale,
            height: o.h * scale,
            transform: [{ rotate: `${o.rotation ?? 0}deg` }],
            ...(selected === o.id ? { borderWidth: 1, borderColor: "#5390cb" } : {}),
          }}
        >
          {o.kind === "image" ? (
            <Image
              source={{ uri: o.src }}
              resizeMode={o.fit ?? "contain"}
              style={{ width: "100%", height: "100%" }}
            />
          ) : o.kind === "shape" ? (
            <View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: o.fill ?? "transparent",
                borderRadius:
                  o.geometry === "ellipse" ? (o.w * scale) / 2 : (o.radius ?? 0) * scale,
                borderColor: o.stroke ?? "transparent",
                borderWidth: o.stroke ? Math.max(0.5, scale) : 0,
              }}
            />
          ) : (
            <Text
              allowFontScaling={false}
              style={{
                fontSize: (o.size ?? 24) * scale,
                lineHeight: (o.size ?? 24) * scale * 1.3,
                color: o.color ?? "#243530",
                fontFamily:
                  o.font === "Georgia"
                    ? "Georgia"
                    : o.font === "Courier New"
                      ? "Courier"
                      : "Inter_400Regular",
                fontWeight: o.bold ? "700" : "400",
                textAlign: o.align ?? "left",
                backgroundColor: o.fill ?? "transparent",
              }}
            >
              {o.text}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
export function PresentationEditor({
  report,
  supervisor = false,
  onClose,
}: {
  report: Report;
  supervisor?: boolean;
  onClose: () => void;
}) {
  const { state, act } = useWorkspace();
  const project = state.projects.find((p) => p.id === report.projectId)!;
  const [deck, setDeck] = useState<Deck>(() => report.deck ?? starterDeck(project.title)),
    [index, setIndex] = useState(0),
    [object, setObject] = useState("title"),
    [tab, setTab] = useState("Slides"),
    [present, setPresent] = useState(false),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState(false),
    [feedback, setFeedback] = useState("");
  const [request, setRequest] = useState<DeckEngineProps["request"]>(null),
    [busy, setBusy] = useState(false);
  const size = useWindowDimensions(),
    width = Math.max(200, size.width - 36);
  const slide = deck.slides[Math.min(index, deck.slides.length - 1)];
  const scene = slideScene(deck, slide, index),
    node = scene.objects.find((o) => o.id === object);
  const editable = !supervisor && report.status === "draft" && project.presentationOpen;
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      setBusy(false);
      setRequest(null);
      setNotice("Presentation processing timed out. Please retry.");
    }, 90000);
    return () => clearTimeout(timer);
  }, [busy]);
  function update(patch: Partial<Slide>) {
    setDeck((d) => ({
      ...d,
      slides: d.slides.map((s) => (s.id === slide.id ? { ...s, ...patch } : s)),
    }));
  }
  function patch(id: string, change: ObjectPatch) {
    setDeck((d) => ({
      ...d,
      slides: d.slides.map((s) => (s.id === slide.id ? patchSlideObject(s, id, change) : s)),
    }));
  }
  function save() {
    if (!editable) return false;
    if (!validDeck(deck)) {
      setNotice("Check slide content and object dimensions before saving.");
      return false;
    }
    const fields = Object.fromEntries(
      deck.slides.map((s, i) => [`Slide ${i + 1}: ${s.title}`, s.body || s.notes || s.title]),
    );
    const ok = act({
      type: "report.save",
      id: report.id,
      fields,
      template: deck.template ?? "margin",
      color: deck.accent ?? themes.find((t) => t.id === deck.theme)!.accent,
      deck,
    });
    if (ok) setNotice("Presentation draft saved.");
    return ok;
  }
  function move(delta: number) {
    const a = [...deck.slides],
      next = index + delta;
    if (next < 0 || next >= a.length) return;
    [a[index], a[next]] = [a[next], a[index]];
    setDeck({ ...deck, slides: a });
    setIndex(next);
  }
  async function image() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 1,
      });
      if (result.canceled) return;
      const a = result.assets[0];
      if ((a.fileSize ?? 0) > 5 * 1024 * 1024 || !a.base64)
        return setNotice("Choose an image under 5 MB.");
      const src = `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`;
      const id = `image-${Date.now()}`;
      update({
        objects: [
          ...(slide.objects ?? []),
          { id, kind: "image", src, x: 260, y: 100, w: 400, h: 280, fit: "contain", z: 20 },
        ],
      });
      setObject(id);
    } catch {
      setNotice("Could not add the image.");
    }
  }
  function addObject(kind: "text" | "shape") {
    const id = `${kind}-${Date.now()}`;
    update({
      objects: [
        ...(slide.objects ?? []),
        {
          id,
          kind,
          x: 100,
          y: 140,
          w: 320,
          h: 100,
          ...(kind === "text"
            ? { text: "Your text", size: 32, color: "#28483e" }
            : { fill: deck.accent ?? "#738e61", geometry: "rect" as const }),
          z: 20,
        },
      ],
    });
    setObject(id);
  }
  async function importPptx() {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      const asset = r.assets[0];
      if ((asset.size ?? 0) > 25 * 1024 * 1024)
        return setNotice("Choose a PowerPoint file under 25 MB.");
      let base64: string;
      if (Platform.OS === "web") {
        const bytes = new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
        let text = "";
        for (let i = 0; i < bytes.length; i += 16000)
          text += String.fromCharCode(...bytes.subarray(i, i + 16000));
        base64 = btoa(text);
      } else {
        const { File } = await import("expo-file-system");
        base64 = await new File(asset.uri).base64();
      }
      setBusy(true);
      setRequest({ id: String(Date.now()), operation: "import", base64, name: asset.name });
    } catch {
      setNotice("Could not read this PowerPoint.");
    }
  }
  async function result(reply: DeckEngineReply) {
    if (reply.type === "ready" || reply.id !== request?.id) return;
    setBusy(false);
    setRequest(null);
    if (reply.type === "error") return setNotice(reply.message);
    if (reply.deck) {
      setDeck(reply.deck);
      setIndex(0);
      setNotice(
        reply.deck.imported?.warnings.join(" · ") ||
          "PowerPoint imported with its original template.",
      );
      return;
    }
    if (reply.data) {
      try {
        const extension = reply.extension ?? "pptx",
          name = `LabAssist-presentation.${extension}`;
        if (Platform.OS === "web") {
          const a = document.createElement("a");
          a.href = reply.data;
          a.download = name;
          a.click();
        } else {
          const { File, Paths } = await import("expo-file-system"),
            sharing = await import("expo-sharing");
          const file = new File(Paths.cache, name);
          file.write(Uint8Array.from(atob(reply.data.split(",")[1]), (c) => c.charCodeAt(0)));
          if (!(await sharing.isAvailableAsync()))
            throw Error("Sharing is unavailable on this device.");
          await sharing.shareAsync(file.uri);
        }
        setNotice("Presentation exported.");
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Export failed.");
      }
    }
  }
  function exportFile(operation: "pdf" | "pptx") {
    if (busy) return;
    if (editable && !save()) return;
    setBusy(true);
    setRequest({ id: String(Date.now()), operation, deck });
  }
  return (
    <View style={kit.stack}>
      <DeckEngine request={request} onResult={result} />
      <View style={kit.wrap}>
        <Button title="Back to reports" variant="ghost" size="sm" onPress={onClose} />
        <Button title="Present" size="sm" onPress={() => setPresent(true)} />
        {editable && <Button title="Save Draft" size="sm" variant="soft" onPress={save} />}
      </View>
      <AppText variant="title">Presentation Studio</AppText>
      <AppText variant="caption" tone="muted">
        {project.title} · {report.status} · {deck.slides.length} slides
      </AppText>
      <View style={kit.wrap}>
        <Button
          title="Export PowerPoint"
          variant="soft"
          size="sm"
          disabled={busy}
          onPress={() => exportFile("pptx")}
        />
        <Button
          title="Export PDF"
          variant="soft"
          size="sm"
          disabled={busy}
          onPress={() => exportFile("pdf")}
        />
        {editable && (
          <Button
            title="Import PowerPoint"
            variant="ghost"
            size="sm"
            disabled={busy}
            onPress={importPptx}
          />
        )}
      </View>
      {!!notice && (
        <AppText accessibilityRole="alert" tone="primary">
          {notice}
        </AppText>
      )}
      {busy && <AppText>Processing presentation…</AppText>}
      <SlidePage
        deck={deck}
        index={index}
        width={width}
        {...(editable ? { onSelect: setObject, onMove: patch, selected: object } : {})}
      />
      <View style={kit.wrap}>
        <Button
          title="Previous"
          size="sm"
          variant="ghost"
          disabled={!index}
          onPress={() => setIndex(index - 1)}
        />
        <AppText>
          {index + 1} / {deck.slides.length}
        </AppText>
        <Button
          title="Next"
          size="sm"
          variant="ghost"
          disabled={index === deck.slides.length - 1}
          onPress={() => setIndex(index + 1)}
        />
      </View>
      <Chips
        value={tab}
        onChange={setTab}
        options={["Slides", "Design", "Content", "Object", "Tips"].map((id) => ({ id, label: id }))}
      />
      {tab === "Slides" && (
        <Panel title="Slides">
          <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
            {deck.slides.map((v, i) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select slide ${i + 1}`}
                key={v.id}
                onPress={() => setIndex(i)}
                style={{
                  padding: 5,
                  borderWidth: 2,
                  borderColor: i === index ? "#839a6e" : "transparent",
                  borderRadius: 9,
                }}
              >
                <SlidePage deck={deck} index={i} width={145} />
                <AppText variant="caption">
                  {i + 1}. {v.title.slice(0, 22)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          {editable && (
            <>
              <Chips
                value={slide.layout}
                onChange={(v) => update({ layout: v as Slide["layout"] })}
                options={layouts.map((v) => ({ id: v.id, label: v.name }))}
              />
              <View style={kit.wrap}>
                <Button
                  title="Add slide"
                  size="sm"
                  disabled={deck.slides.length >= 40}
                  onPress={() => {
                    setDeck({ ...deck, slides: [...deck.slides, newSlide()] });
                    setIndex(deck.slides.length);
                  }}
                />
                <Button
                  title="Duplicate"
                  variant="soft"
                  size="sm"
                  disabled={deck.slides.length >= 40}
                  onPress={() => {
                    const a = [...deck.slides];
                    a.splice(index + 1, 0, {
                      ...JSON.parse(JSON.stringify(slide)),
                      id: `slide-${Date.now()}`,
                    });
                    setDeck({ ...deck, slides: a });
                    setIndex(index + 1);
                  }}
                />
                <Button
                  title="Move up"
                  size="sm"
                  variant="ghost"
                  onPress={() => move(-1)}
                  disabled={!index}
                />
                <Button
                  title="Move down"
                  size="sm"
                  variant="ghost"
                  onPress={() => move(1)}
                  disabled={index === deck.slides.length - 1}
                />
                <Button
                  title="Delete slide"
                  variant="danger"
                  size="sm"
                  disabled={deck.slides.length === 1}
                  onPress={() => {
                    setDeck({ ...deck, slides: deck.slides.filter((_, i) => i !== index) });
                    setIndex(Math.max(0, index - 1));
                  }}
                />
              </View>
            </>
          )}
        </Panel>
      )}
      {tab === "Design" && (
        <Panel title="Design library">
          <AppText variant="caption">20 different layouts. Color is a separate choice.</AppText>
          {deck.imported ? (
            <AppText>
              Imported template: {deck.imported.name}. Original slide objects remain editable.
            </AppText>
          ) : (
            <View style={kit.wrap}>
              {templates.map((v) => (
                <Pressable
                  accessibilityRole="button"
                  key={v.id}
                  onPress={() => editable && setDeck({ ...deck, template: v.id })}
                  style={{
                    width: "47%",
                    padding: 8,
                    borderRadius: 13,
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: deck.template === v.id ? "#748c5d" : "#e1e5da",
                  }}
                >
                  <SlidePage
                    deck={{ ...deck, template: v.id }}
                    index={index}
                    width={Math.max(100, (width - 64) / 2)}
                  />
                  <AppText variant="caption" weight="bold">
                    {v.name}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {v.category}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
          <Chips
            value={deck.theme}
            onChange={(v) => editable && setDeck({ ...deck, theme: v, accent: undefined })}
            options={themes.map((v) => ({ id: v.id, label: v.name }))}
          />
          <Field
            label="Custom accent color"
            editable={editable}
            value={deck.accent ?? themes.find((t) => t.id === deck.theme)!.accent}
            onChangeText={(v) => /^#[0-9a-f]{6}$/i.test(v) && setDeck({ ...deck, accent: v })}
          />
        </Panel>
      )}
      {tab === "Content" && (
        <Panel title="Slide content">
          <Field
            label="Slide title"
            editable={editable}
            value={slide.title}
            onChangeText={(v) => update({ title: v })}
            maxLength={110}
          />
          <Field
            label="Kicker"
            editable={editable}
            value={slide.kicker}
            onChangeText={(v) => update({ kicker: v })}
            maxLength={70}
          />
          <Field
            label="Slide body"
            editable={editable}
            value={slide.body}
            onChangeText={(v) => update({ body: v })}
            multiline
            maxLength={1200}
          />
          <Field
            label="Caption"
            editable={editable}
            value={slide.caption}
            onChangeText={(v) => update({ caption: v })}
            maxLength={160}
          />
          <Field
            label="Speaker notes"
            editable={editable}
            value={slide.notes}
            onChangeText={(v) => update({ notes: v })}
            multiline
            maxLength={3000}
          />
          {editable && (
            <View style={kit.wrap}>
              <Button title="Add text" size="sm" variant="soft" onPress={() => addObject("text")} />
              <Button title="Add image" size="sm" variant="soft" onPress={image} />
              <Button
                title="Add shape"
                size="sm"
                variant="soft"
                onPress={() => addObject("shape")}
              />
            </View>
          )}
        </Panel>
      )}
      {tab === "Object" && (
        <Panel title="Move & resize objects">
          <AppText variant="caption">
            Select an object or drag it on the slide. Position and size are unrestricted by template
            placeholders.
          </AppText>
          <Chips
            value={object}
            onChange={setObject}
            options={scene.objects
              .filter((o) => !o.locked)
              .map((o) => ({ id: o.id, label: o.kind + " · " + (o.text?.slice(0, 18) ?? o.id) }))}
          />
          {node && !node.locked && (
            <>
              {node.kind === "text" && (
                <Field
                  label="Object text"
                  value={node.text ?? ""}
                  editable={editable}
                  onChangeText={(v) => patch(node.id, { text: v })}
                  multiline
                />
              )}
              <View style={kit.wrap}>
                {(["x", "y", "w", "h", "size", "rotation"] as const)
                  .filter((k) => node.kind === "text" || k !== "size")
                  .map((k) => (
                    <View key={k} style={{ width: "45%" }}>
                      <Field
                        label={k}
                        value={String(node[k] ?? (k === "size" ? 24 : 0))}
                        keyboardType="numeric"
                        editable={editable}
                        onChangeText={(v) => {
                          const n = Number(v);
                          if (
                            Number.isFinite(n) &&
                            ((k !== "w" && k !== "h" && k !== "size") || n > 0)
                          )
                            patch(node.id, { [k]: n });
                        }}
                      />
                    </View>
                  ))}
              </View>
              {node.kind === "text" && (
                <>
                  <Chips
                    value={node.font ?? "Inter"}
                    onChange={(font) => editable && patch(node.id, { font })}
                    options={["Inter", "Georgia", "Courier New"].map((id) => ({ id, label: id }))}
                  />
                  <Field
                    label="Text color (#RRGGBB)"
                    editable={editable}
                    value={node.color ?? "#243530"}
                    onChangeText={(color) =>
                      /^#[0-9a-f]{6}$/i.test(color) && patch(node.id, { color })
                    }
                  />
                </>
              )}
              {node.kind === "shape" && (
                <Field
                  label="Fill color (#RRGGBB)"
                  editable={editable}
                  value={node.fill ?? "#738e61"}
                  onChangeText={(fill) => /^#[0-9a-f]{6}$/i.test(fill) && patch(node.id, { fill })}
                />
              )}
              {node.kind === "image" && (
                <Chips
                  value={node.fit ?? "contain"}
                  onChange={(fit) =>
                    editable && patch(node.id, { fit: fit as "contain" | "cover" })
                  }
                  options={[
                    { id: "contain", label: "Fit image" },
                    { id: "cover", label: "Fill frame" },
                  ]}
                />
              )}
              {editable && (
                <View style={kit.wrap}>
                  {node.kind === "text" && (
                    <>
                      <Button
                        title={node.bold ? "Bold ✓" : "Bold"}
                        size="sm"
                        variant="soft"
                        onPress={() => patch(node.id, { bold: !node.bold })}
                      />
                      {(["left", "center", "right"] as const).map((align) => (
                        <Button
                          key={align}
                          title={align}
                          size="sm"
                          variant="ghost"
                          onPress={() => patch(node.id, { align })}
                        />
                      ))}
                    </>
                  )}
                  <Button
                    title="Bring forward"
                    size="sm"
                    variant="ghost"
                    onPress={() => patch(node.id, { z: (node.z ?? 10) + 1 })}
                  />
                  <Button
                    title="Send backward"
                    size="sm"
                    variant="ghost"
                    onPress={() => patch(node.id, { z: (node.z ?? 10) - 1 })}
                  />
                  <Button
                    title="Remove object"
                    size="sm"
                    variant="danger"
                    onPress={() =>
                      slide.objects?.some((o) => o.id === node.id)
                        ? update({ objects: slide.objects.filter((o) => o.id !== node.id) })
                        : patch(node.id, { hidden: true })
                    }
                  />
                </View>
              )}
            </>
          )}
        </Panel>
      )}
      {tab === "Tips" && (
        <Panel title="Presentation guidance">
          {slideTips(slide, deck).map((t) => (
            <View key={t.id} style={{ gap: 5, paddingVertical: 10 }}>
              <AppText weight="bold">{t.title}</AppText>
              <AppText variant="caption" tone="muted">
                {t.detail}
              </AppText>
            </View>
          ))}
        </Panel>
      )}
      {editable && (
        <Button title="Submit presentation" onPress={() => save() && setConfirm(true)} />
      )}
      {supervisor && (
        <Panel title="Supervisor feedback">
          <Chips
            value={String(index)}
            onChange={(v) => setIndex(Number(v))}
            options={deck.slides.map((s, i) => ({ id: String(i), label: `Slide ${i + 1}` }))}
          />
          <Field label="Slide feedback" value={feedback} onChangeText={setFeedback} multiline />
          <Button
            title="Send feedback"
            disabled={!feedback.trim()}
            onPress={() => {
              if (
                act({
                  type: "report.review",
                  status: "reviewed",
                  id: report.id,
                  body: feedback,
                  section: `Slide ${index + 1}`,
                })
              )
                setFeedback("");
            }}
          />
          {report.feedback.map((f) => (
            <AppText key={f.id}>
              {f.section}: {f.body}
            </AppText>
          ))}
        </Panel>
      )}
      <Modal
        visible={present}
        presentationStyle="fullScreen"
        onRequestClose={() => setPresent(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#111a1d", justifyContent: "center" }}>
          <View style={{ alignItems: "center" }}>
            <SlidePage
              deck={deck}
              index={index}
              width={Math.min(size.width, (size.height * 960) / scene.height)}
            />
          </View>
          <View style={[kit.wrap, { justifyContent: "center", padding: 14 }]}>
            <Button
              title="Previous"
              variant="soft"
              disabled={!index}
              onPress={() => setIndex(index - 1)}
            />
            <Button
              title="Next"
              variant="soft"
              disabled={index === deck.slides.length - 1}
              onPress={() => setIndex(index + 1)}
            />
            <Button title="Close presentation" variant="soft" onPress={() => setPresent(false)} />
          </View>
        </SafeAreaView>
      </Modal>
      <Modal visible={confirm} transparent onRequestClose={() => setConfirm(false)}>
        <View
          style={{ flex: 1, justifyContent: "center", padding: 25, backgroundColor: "#24332488" }}
        >
          <Panel title="Submit shared presentation?">
            <AppText>
              The saved deck will be sent for supervisor review in this local preview.
            </AppText>
            <Button title="Keep editing" variant="ghost" onPress={() => setConfirm(false)} />
            <Button
              title="Confirm submission"
              onPress={() => {
                if (act({ type: "report.submit", id: report.id })) {
                  setConfirm(false);
                  setNotice("Presentation submitted.");
                }
              }}
            />
          </Panel>
        </View>
      </Modal>
    </View>
  );
}
