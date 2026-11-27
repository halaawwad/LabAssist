import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { router } from "./router";
import { View } from "react-native";
import { AppText, Button } from "@/components";
import { Field, Panel, Ring, SegmentedControl, kit, useCopy } from "@/components/MobileKit";
import { useFinanceEditor } from "../../../shared/project-work/useFinanceEditor";
import type { FinanceClient } from "../../../shared/project-work/useProjectFinance";
import { useProjectWorkspace } from "./StudentReference";
export function LiveBudgetSummary({ onManage }: { onManage?: () => void }) {
  const { finance } = useProjectWorkspace();
  const copy = useCopy();
  const b = finance.data?.budget;
  return (
    <Panel title={copy("Budget health", "حالة الميزانية")}>
      {b ? (
        <>
          <AppText variant="title">
            {b.currency} {b.remaining}
          </AppText>
          <AppText>{copy("Remaining", "المتبقي")}</AppText>
          <Ring
            value={Math.min(
              100,
              Math.max(
                0,
                Number(b.amount) > 0
                  ? (Number(b.spent) / Number(b.amount)) * 100
                  : Number(b.spent) > 0
                    ? 100
                    : 0,
              ),
            )}
          />
          <AppText>
            {copy("Spent", "المصروف")}: {b.currency} {b.spent}
          </AppText>
          <AppText tone="muted">
            {copy("Budget", "الميزانية")}: {b.currency} {b.amount}
          </AppText>
        </>
      ) : (
        <AppText>
          {finance.loading
            ? copy("Loading budget…", "جارٍ تحميل الميزانية…")
            : finance.error
              ? copy("Could not load budget.", "تعذّر تحميل الميزانية.")
              : copy(
                  "Set your project budget and currency first.",
                  "حدّد ميزانية المشروع وعملته أولاً.",
                )}
        </AppText>
      )}
      {onManage && (
        <Button
          title={copy("Manage budget & parts", "إدارة الميزانية والقطع")}
          variant="ghost"
          onPress={onManage}
        />
      )}
    </Panel>
  );
}
export function LiveFinancePanel() {
  const { finance } = useProjectWorkspace();
  const copy = useCopy();
  if (!finance.data)
    return (
      <Panel>
        <AppText accessibilityRole="alert">
          {finance.loading
            ? copy("Loading project finances…", "جارٍ تحميل مالية المشروع…")
            : copy("Could not load project finances.", "تعذّر تحميل مالية المشروع.")}
        </AppText>
        <Button title={copy("Retry", "إعادة المحاولة")} onPress={() => void finance.reload()} />
      </Panel>
    );
  return <FinanceForms key={finance.data.projectId} finance={finance} />;
}
function FinanceForms({ finance }: { finance: FinanceClient }) {
  const copy = useCopy();
  const f = useFinanceEditor(finance);
  const [receiptError, setReceiptError] = useState("");
  const d = finance.data!;
  const notices: Record<string, string> = {
    budgetSaved: copy("Budget saved.", "تم حفظ الميزانية."),
    bomSaved: copy("Part saved.", "تم حفظ القطعة."),
    expenseSaved: copy("Purchase recorded.", "تم تسجيل الشراء."),
    expenseVoided: copy("Expense voided; history preserved.", "تم إلغاء المصروف مع حفظ السجل."),
  };
  return (
    <View style={kit.stack}>
      {!!finance.error && (
        <Panel>
          <AppText accessibilityRole="alert">
            {finance.error === "conflict"
              ? copy(
                  "This item changed. Reload before retrying.",
                  "تغيّر هذا العنصر. أعد التحميل قبل المحاولة.",
                )
              : copy(
                  "Could not save or reload. Your input is preserved.",
                  "تعذّر الحفظ أو التحميل. بياناتك محفوظة في النموذج.",
                )}
          </AppText>
          <Button
            title={copy("Reload finances", "تحديث البيانات")}
            onPress={() => void f.latestBudget()}
          />
        </Panel>
      )}
      {!!f.notice && <AppText accessibilityRole="alert">{notices[f.notice]}</AppText>}
      {d.readOnly && (
        <AppText>{copy("This project is read-only.", "هذا المشروع للعرض فقط.")}</AppText>
      )}
      <LiveBudgetSummary />
      <Panel title={copy("Project budget", "ميزانية المشروع")}>
        <Field
          editable={!f.disabled}
          label={copy("Budget amount", "قيمة الميزانية")}
          value={f.budget.amount}
          onChangeText={(amount) => f.setBudget({ ...f.budget, amount })}
          keyboardType="decimal-pad"
        />
        {d.budget ? (
          <AppText>{d.budget.currency}</AppText>
        ) : (
          <SegmentedControl
            accessibilityLabel={copy("Currency", "العملة")}
            value={f.budget.currency}
            options={["ILS", "USD", "JOD"].map((id) => ({ id, label: id }))}
            onChange={(currency) => f.setBudget({ ...f.budget, currency })}
          />
        )}
        <Button
          title={copy("Save budget", "حفظ الميزانية")}
          disabled={!f.canBudget}
          loading={finance.saving}
          onPress={() => void f.saveBudget()}
        />
      </Panel>
      <Panel title={copy("Build readiness", "جاهزية البناء")}>
        <Ring
          value={
            d.bom.filter((x) => x.isNeeded).reduce((n, x) => n + x.quantityRequired, 0)
              ? Math.min(
                  100,
                  (d.bom
                    .filter((x) => x.isNeeded)
                    .reduce((n, x) => n + Math.min(x.acquiredQuantity, x.quantityRequired), 0) /
                    d.bom.filter((x) => x.isNeeded).reduce((n, x) => n + x.quantityRequired, 0)) *
                    100,
                )
              : 0
          }
        />
        <AppText>
          {copy("Still needed", "ما زالت مطلوبة")}:{" "}
          {d.bom.reduce((n, x) => n + x.missingQuantity, 0)}
        </AppText>
        <AppText>
          {copy("Known estimated cost", "التكلفة التقديرية المعروفة")}: {d.budget?.currency}{" "}
          {d.budget?.estimatedKnown ?? "0.00"}
        </AppText>
        <AppText tone="muted">
          {copy("Parts without an estimate", "قطع بدون سعر تقديري")}: {d.budget?.unpricedItems ?? 0}
        </AppText>
      </Panel>
      <Button
        title={copy("Explore component catalog", "استكشاف كتالوج القطع")}
        variant="ghost"
        onPress={() => router.push("/native/student/catalog")}
      />
      <Panel title={copy("Bill of Materials", "قائمة المواد")}>
        {!d.bom.length && <AppText>{copy("No parts added yet.", "لم تتم إضافة قطع بعد.")}</AppText>}
        {d.bom.map((part) => (
          <View key={part.id} style={kit.stack}>
            <AppText weight="semibold">{part.name}</AppText>
            <AppText>
              {copy("Required", "المطلوب")}: {part.quantityRequired} ·{" "}
              {copy("Purchased", "المشترى")}: {part.acquiredQuantity} · {copy("Missing", "المتبقي")}
              : {part.missingQuantity}
            </AppText>
            <AppText>
              {part.isNeeded ? copy("Needed", "مطلوبة") : copy("Not needed", "غير لازمة")} ·{" "}
              {d.budget?.currency} {part.estimatedUnitPrice ?? copy("Not priced", "غير مسعّرة")}
            </AppText>
            {!!part.notNeededReason && <AppText>{part.notNeededReason}</AppText>}
            <Button
              title={copy("Edit part", "تعديل القطعة")}
              variant="ghost"
              disabled={f.disabled}
              onPress={() => f.editBom(part)}
            />
          </View>
        ))}
      </Panel>
      <Panel title={f.bom.id ? copy("Edit part", "تعديل القطعة") : copy("Add part", "إضافة قطعة")}>
        {!d.budget && (
          <AppText>
            {copy("Save a budget before adding parts.", "احفظ الميزانية قبل إضافة القطع.")}
          </AppText>
        )}
        <Field
          editable={!f.disabled}
          label={copy("Part name", "اسم القطعة")}
          value={f.bom.name}
          onChangeText={(name) => f.setBom({ ...f.bom, name })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Required quantity", "الكمية المطلوبة")}
          value={f.bom.quantityRequired}
          keyboardType="number-pad"
          onChangeText={(quantityRequired) => f.setBom({ ...f.bom, quantityRequired })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Estimated unit price (optional)", "السعر التقديري للوحدة (اختياري)")}
          value={f.bom.estimatedUnitPrice}
          keyboardType="decimal-pad"
          onChangeText={(estimatedUnitPrice) => f.setBom({ ...f.bom, estimatedUnitPrice })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Notes", "ملاحظات")}
          value={f.bom.notes}
          onChangeText={(notes) => f.setBom({ ...f.bom, notes })}
        />
        {!!f.bom.id && (
          <>
            <SegmentedControl
              accessibilityLabel={copy("Part needed", "هل القطعة لازمة")}
              value={f.bom.isNeeded ? "yes" : "no"}
              options={[
                { id: "yes", label: copy("Needed", "مطلوبة") },
                { id: "no", label: copy("Not needed", "غير لازمة") },
              ]}
              onChange={(value) => f.setBom({ ...f.bom, isNeeded: value === "yes" })}
            />
            {!f.bom.isNeeded && (
              <Field
                editable={!f.disabled}
                label={copy("Reason", "السبب")}
                value={f.bom.notNeededReason}
                onChangeText={(notNeededReason) => f.setBom({ ...f.bom, notNeededReason })}
              />
            )}
            <Button
              title={copy("Cancel edit", "إلغاء التعديل")}
              variant="ghost"
              disabled={f.disabled}
              onPress={f.cancelBom}
            />
          </>
        )}
        <Button
          title={copy("Save part", "حفظ القطعة")}
          disabled={!f.canBom}
          onPress={() => void f.saveBom()}
        />
      </Panel>
      <Panel title={copy("Record purchase", "تسجيل شراء")}>
        <SegmentedControl
          accessibilityLabel={copy("Purchased part", "القطعة المشتراة")}
          value={f.expense.bomItemId}
          options={[
            { id: "", label: copy("Other expense", "مصروف آخر") },
            ...d.bom.filter((p) => p.isNeeded).map((p) => ({ id: p.id, label: p.name })),
          ]}
          onChange={f.choosePart}
        />
        <Field
          editable={!f.disabled}
          label={copy("Purchase description", "وصف الشراء")}
          value={f.expense.label}
          onChangeText={(label) => f.setExpense({ ...f.expense, label })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Purchase quantity", "كمية الشراء")}
          value={f.expense.quantity}
          keyboardType="number-pad"
          onChangeText={(quantity) => f.setExpense({ ...f.expense, quantity })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Actual unit price", "سعر الوحدة الفعلي")}
          value={f.expense.unitPrice}
          keyboardType="decimal-pad"
          onChangeText={(unitPrice) => f.setExpense({ ...f.expense, unitPrice })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Purchase date (YYYY-MM-DD)", "تاريخ الشراء (YYYY-MM-DD)")}
          value={f.expense.purchasedOn}
          onChangeText={(purchasedOn) => f.setExpense({ ...f.expense, purchasedOn })}
        />
        <Field
          editable={!f.disabled}
          label={copy("Seller (optional)", "البائع (اختياري)")}
          value={f.expense.sellerName}
          onChangeText={(sellerName) => f.setExpense({ ...f.expense, sellerName })}
        />
        <AppText>
          {copy(
            "Receipt (optional, PDF/PNG/JPEG, max 1 MiB)",
            "الفاتورة (اختياري، PDF/PNG/JPEG، حتى 1 MiB)",
          )}
        </AppText>
        {!!f.expense.receiptName && <AppText>{f.expense.receiptName}</AppText>}
        {!!receiptError && <AppText accessibilityRole="alert">{receiptError}</AppText>}
        <Button
          title={copy("Attach receipt", "إرفاق فاتورة")}
          disabled={f.disabled}
          variant="ghost"
          onPress={() =>
            void (async () => {
              setReceiptError("");
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ["application/pdf", "image/png", "image/jpeg"],
                  copyToCacheDirectory: true,
                });
                if (result.canceled) return;
                const asset = result.assets[0];
                if (!asset || !asset.size || asset.size > 1048576) {
                  setReceiptError(
                    copy("Choose a receipt up to 1 MiB.", "اختَر فاتورة بحجم حتى 1 MiB."),
                  );
                  return;
                }
                const content=asset.file ? await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Read failed'));reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.readAsDataURL(asset.file!);}) : await new File(asset.uri).base64();
                  await f.attachReceipt(asset.name, content);
              } catch {
                setReceiptError(copy("Could not attach receipt.", "تعذّر إرفاق الفاتورة."));
              }
            })()
          }
        />
        <Button
          title={copy("Save purchase", "حفظ الشراء")}
          disabled={!f.canExpense}
          onPress={() => void f.saveExpense()}
        />
        <Button
          title={copy("Clear purchase form", "تفريغ نموذج الشراء")}
          variant="ghost"
          disabled={f.disabled}
          onPress={f.startNewExpense}
        />
      </Panel>
      <Panel title={copy("Expense history", "سجل المصاريف")}>
        {!d.expenses.length && (
          <AppText>{copy("No purchases recorded.", "لا يوجد شراء مسجّل.")}</AppText>
        )}
        {d.expenses.map((e) => (
          <View key={e.id} style={kit.stack}>
            <AppText weight="semibold">{e.lines.map((l) => l.label).join(", ")}</AppText>
            <AppText>
              {d.budget?.currency} {e.amount} · {e.purchasedOn} ·{" "}
              {e.status === "VOIDED" ? copy("Voided", "ملغى") : copy("Recorded", "مسجّل")}
            </AppText>
            {!!e.receiptFileId && <AppText>{copy("Receipt attached", "فاتورة مرفقة")}</AppText>}
            {!!e.voidReason && <AppText>{e.voidReason}</AppText>}
            {e.status === "POSTED" && (
              <Button
                title={copy("Void expense", "إلغاء المصروف")}
                variant="ghost"
                disabled={f.disabled}
                onPress={() => f.prepareVoid(e)}
              />
            )}
          </View>
        ))}
        {f.voidDraft && (
          <>
            <Field
              editable={!f.disabled}
              label={copy("Cancellation reason", "سبب الإلغاء")}
              value={f.voidDraft.reason}
              onChangeText={(reason) =>
                f.setVoidDraft(f.voidDraft ? { ...f.voidDraft, reason } : null)
              }
            />
            <Button
              title={copy("Confirm cancellation", "تأكيد الإلغاء")}
              variant="danger"
              disabled={f.disabled || !f.voidDraft.reason.trim()}
              onPress={() => void f.saveVoid()}
            />
            <Button
              title={copy("Keep expense", "إبقاء المصروف")}
              variant="ghost"
              onPress={() => f.setVoidDraft(null)}
            />
          </>
        )}
      </Panel>
    </View>
  );
}
