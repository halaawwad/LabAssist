import { MobileModal as Modal } from "@/components/MobileModal";
import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "@/components";
import { useLanguage } from "@/i18n";
import { Chips, Panel, kit, useCopy } from "@/components/MobileKit";
import {
  columns,
  initialMapping,
  type Column,
  type Workbook,
} from "../../../../shared/department/workbook";
import { planImport, type ImportReview } from "../../../../shared/department/records";
import { webAccounts, type Account, type Group } from "./departmentData";
import { pickDepartmentWorkbook, shareDepartmentTemplate } from "./departmentFiles";

export function DepartmentImport({
  accounts,
  groups,
  ready,
  saving,
  onConfirm,
  onRetry,
  storageError,
  revision,
}: {
  accounts: Account[];
  groups: Group[];
  ready: boolean;
  saving: boolean;
  onRetry: () => void;
  storageError: string;
  revision: number;
  onConfirm: (
    book: Workbook,
    mapping: Record<Column, number>,
    keep: string[],
    transfers: boolean,
  ) => Promise<ImportReview | false>;
}) {
  const t = useCopy();
  const { isRTL } = useLanguage();
  const [invalidFile, setInvalidFile] = useState(false);
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [book, setBook] = useState<Workbook | null>(null);
  const [mapping, setMapping] = useState(() => initialMapping([])),
    [adjust, setAdjust] = useState(false),
    [keep, setKeep] = useState<string[]>([]),
    [transferConsent, setTransferConsent] = useState<string | null>(null);
  const transferKey = JSON.stringify([revision, groups]);
  const transfers = transferConsent === transferKey;
  const setTransfers = (confirmed: boolean) => setTransferConsent(confirmed ? transferKey : null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const review = useMemo(
    () =>
      book
        ? planImport(
            book,
            mapping,
            webAccounts(accounts),
            groups,
            keep,
            transfers,
            "pending-drafts",
          )
        : null,
    [book, mapping, accounts, groups, keep, transfers],
  );
  const reasons = review
    ? [
        ...review.errors,
        ...review.rows.flatMap((r) =>
          r.errors.map((message) => `${t("Row", "الصف")} ${r.number}: ${message}`),
        ),
      ]
    : [];
  const blocked = !ready || saving || busy || !book || invalidFile || reasons.length > 0;
  const projects = new Map<string, NonNullable<typeof review>["rows"]>();
  for (const row of review?.rows ?? [])
    projects.set(row.values[0] || t("Missing project number", "رقم المشروع مفقود"), [
      ...(projects.get(row.values[0] || t("Missing project number", "رقم المشروع مفقود")) ?? []),
      row,
    ]);
  async function pick() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const selected = await pickDepartmentWorkbook();
      if (!selected) return;
      const detected = initialMapping(selected.workbook.headers);
      setName(selected.name);
      setBook(selected.workbook);
      setInvalidFile(false);
      setMapping(detected);
      setKeep([]);
      setTransfers(false);
      setAdjust(columns.some((c) => detected[c] < 0));
    } catch (cause) {
      setInvalidFile(true);
      setError(
        cause instanceof Error ? cause.message : t("Could not read file.", "تعذر قراءة الملف."),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <View style={kit.wrap}>
        <Button
          title={t("Import Excel", "استيراد Excel")}
          variant="soft"
          disabled={!ready || saving}
          onPress={() => {
            setOpen(true);
            setError("");
          }}
        />
        <Button
          title={t("Excel template", "قالب Excel")}
          variant="ghost"
          onPress={async () => {
            try {
              await shareDepartmentTemplate();
            } catch (cause) {
              setOpen(true);
              setError(
                cause instanceof Error
                  ? cause.message
                  : t("Could not share template.", "تعذرت مشاركة القالب."),
              );
            }
          }}
        />
      </View>
      <Modal
        visible={open}
        onRequestClose={() => {
          if (!saving && !busy) setOpen(false);
        }}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#fafbf7", direction: isRTL ? "rtl" : "ltr" }}
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 14 }}
          >
            <Button
              title={t("Close", "إغلاق")}
              variant="ghost"
              disabled={saving || busy}
              onPress={() => setOpen(false)}
            />
            <AppText variant="title">{t("Import groups", "استيراد مجموعات")}</AppText>
            <Button
              title={t("Choose Excel file", "اختيار ملف Excel")}
              loading={busy}
              disabled={saving}
              onPress={pick}
            />
            {!!name && <AppText>{name}</AppText>}
            {!!error && (
              <AppText tone="danger" accessibilityRole="alert">
                {error}
              </AppText>
            )}
            {!!storageError && (
              <View>
                <AppText tone="danger" accessibilityRole="alert">
                  {storageError}
                </AppText>
                <Button
                  title={t("Retry loading", "إعادة التحميل")}
                  variant="ghost"
                  disabled={saving}
                  onPress={onRetry}
                />
              </View>
            )}
            {!!book && (
              <>
                <Button
                  title={t("Adjust columns", "ضبط الأعمدة")}
                  variant="ghost"
                  accessibilityState={{ expanded: adjust }}
                  onPress={() => setAdjust(!adjust)}
                />
                {adjust &&
                  columns.map((c) => (
                    <Panel key={c} title={c}>
                      <Chips
                        value={String(mapping[c])}
                        onChange={(value) => {
                          setMapping({ ...mapping, [c]: Number(value) });
                          setKeep([]);
                          setTransfers(false);
                        }}
                        options={[
                          { id: "-1", label: t("Select column", "اختيار عمود") },
                          ...Array.from({ length: book.headers.length }, (_, i) => ({
                            id: String(i),
                            label: `${i + 1}: ${book.headers[i] || t("Blank", "فارغ")}`,
                          })),
                        ]}
                      />
                    </Panel>
                  ))}
                {!!review && (
                  <AppText>
                    {t("New groups", "مجموعات جديدة")}: {review.summary.groupsCreated} ·{" "}
                    {t("Reused groups", "مجموعات موجودة")}: {review.summary.groupsReused} ·{" "}
                    {t("New accounts", "حسابات جديدة")}: {review.summary.accountsCreated}
                  </AppText>
                )}
                {[...projects].map(([number, rows]) => (
                  <Panel
                    key={number}
                    title={`${number} · ${rows[0].values[1] || t("Untitled project", "مشروع بلا اسم")}`}
                  >
                    <AppText weight="bold">
                      {t("Supervisor", "المشرف")}: {rows[0].values[3]} · {rows[0].values[2]}
                    </AppText>
                    {rows.map((row, i) => (
                      <View key={i} style={{ gap: 4 }}>
                        <AppText>
                          {row.values[6]} · {row.values[5]}
                        </AppText>
                        <AppText variant="caption">
                          {row.values[7]} · {t("Row", "الصف")} {row.number}
                        </AppText>
                        {row.errors.map((message, j) => (
                          <AppText key={j} tone="danger">
                            {message}
                          </AppText>
                        ))}
                      </View>
                    ))}
                  </Panel>
                ))}
                {review?.detailConflicts.map((c) => (
                  <View key={c.key}>
                    <AppText>{c.description}</AppText>
                    <Button
                      title={
                        keep.includes(c.key)
                          ? t("Saved details retained", "تم الاحتفاظ بالبيانات المحفوظة")
                          : t("Keep saved details", "الاحتفاظ بالبيانات المحفوظة")
                      }
                      variant="soft"
                      onPress={() =>
                        setKeep(
                          keep.includes(c.key) ? keep.filter((k) => k !== c.key) : [...keep, c.key],
                        )
                      }
                    />
                  </View>
                ))}
                {!!review?.transfers.length && (
                  <Panel title={t("Student transfers", "نقل الطلاب")}>
                    {review.transfers.map((transfer, i) => (
                      <AppText key={i}>{transfer}</AppText>
                    ))}
                    <Button
                      title={
                        transfers
                          ? t("Transfers confirmed", "تم تأكيد النقل")
                          : t("Confirm transfers", "تأكيد النقل")
                      }
                      variant="soft"
                      onPress={() => setTransfers(!transfers)}
                    />
                  </Panel>
                )}
                {reasons.map((reason, i) => (
                  <AppText key={i} tone="danger">
                    {reason}
                  </AppText>
                ))}
              </>
            )}
            <Button
              title={t("Add groups", "إضافة المجموعات")}
              disabled={blocked}
              loading={saving}
              onPress={async () => {
                if (!book || blocked || pending.current) return;
                pending.current = true;
                setError("");
                try {
                  const applied = await onConfirm(book, mapping, keep, transfers);
                  if (!applied) {
                    setError(
                      t(
                        "Could not save. Your preview is preserved. Retry loading, then save again.",
                        "تعذر الحفظ. المعاينة محفوظة. أعد التحميل ثم الحفظ.",
                      ),
                    );
                    return;
                  }
                  const failures = [
                    ...applied.errors,
                    ...applied.rows.flatMap((r) =>
                      r.errors.map((message) => `${r.number}: ${message}`),
                    ),
                  ];
                  if (failures.length) {
                    setError(failures.join("\n"));
                    return;
                  }
                  setOpen(false);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : t(
                          "Could not save. Your preview is preserved.",
                          "تعذر الحفظ. المعاينة محفوظة.",
                        ),
                  );
                } finally {
                  pending.current = false;
                }
              }}
            />
            {blocked && (
              <AppText tone="muted">
                {(invalidFile ? error : reasons[0]) ||
                  (!ready
                    ? t("Load records before adding groups.", "حمّل السجلات أولًا.")
                    : !book
                      ? t("Choose an Excel file first.", "اختر ملف Excel أولًا.")
                      : t("Please wait…", "يرجى الانتظار…"))}
              </AppText>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
