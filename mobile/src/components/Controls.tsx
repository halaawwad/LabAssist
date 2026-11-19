import { Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, Switch as NativeSwitch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLanguage } from "@/i18n";
import { colors, radius } from "@/theme";

import { AppText } from "./AppText";
import { PrimaryFullWidth } from "./Button";
import { MobileInput as TextInput } from "./MobileInput";
import { MobileModal as Modal } from "./MobileModal";
import { TouchTarget as Pressable } from "./TouchTarget";

/** Selected state for toggle controls: native screen readers and web ARIA. */
export function pressedState(selected: boolean) {
  return {
    accessibilityState: { selected },
    ...(Platform.OS === "web" ? ({ "aria-pressed": selected } as object) : {}),
  };
}

/** Filter chip: looks 32px high, but the whole 44px row is the touch target. */
export function Chip({
  label,
  selected = false,
  onPress,
  count,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (count === undefined ? label : `${label}, ${count}`)
      }
      {...pressedState(selected)}
      onPress={onPress}
      style={styles.chipTarget}
    >
      <View style={[styles.chip, selected && styles.chipSelected]}>
        <AppText
          weight={selected ? "semibold" : "medium"}
          tone={selected ? "inverse" : "default"}
          numberOfLines={1}
          style={styles.chipLabel}
        >
          {label}
        </AppText>
        {count !== undefined && (
          <View style={[styles.count, selected && styles.countSelected]}>
            <AppText
              tone={selected ? "primary" : "inverse"}
              weight="semibold"
              style={styles.countText}
            >
              {count}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Two to four mutually exclusive options; equal widths, wraps labels at 320px. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  tone = "olive",
  minOptionWidth = 96,
}: {
  options: { id: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** `status` colours a selected "absent"/negative option red. */
  tone?: "olive" | "status";
  /** Narrowest an option may get before the control wraps into two rows. */
  minOptionWidth?: number;
}) {
  // Options never shrink below a readable width: at 320px, four sections become 2 × 2.
  const [width, setWidth] = useState(0);
  const perRow =
    width && options.length > 2 && (width - 6) / options.length < minOptionWidth
      ? Math.ceil(options.length / 2)
      : options.length;
  const optionWidth = width ? (width - 6 - 3 * (perRow - 1)) / perRow : undefined;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, perRow < options.length && styles.trackWrap]}
    >
      {options.map((option, index) => {
        const selected = option.id === value;
        const negative = tone === "status" && index === options.length - 1;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            aria-checked={selected}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.id)}
            style={[
              styles.segment,
              // An explicit basis: RNW turns `flex: 0` into a 0% basis that would override `width`.
              perRow < options.length && {
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: optionWidth,
                width: optionWidth,
              },
              selected && (negative ? styles.segmentNegative : styles.segmentSelected),
            ]}
          >
            <AppText
              align="center"
              weight={selected ? "semibold" : "medium"}
              tone={selected ? (negative ? "danger" : "inverse") : "strong"}
              style={styles.segmentLabel}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Search input with an icon, a meaningful placeholder and a clear button. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  label,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Accessible name; defaults to the placeholder. */
  label?: string;
}) {
  const { language } = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        accessibilityLabel={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "ar" ? "مسح البحث" : "Clear search"}
          onPress={() => onChangeText("")}
          style={styles.iconButton}
        >
          <X size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

/** Icon-only button: 44×44 target and a required accessible label. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  variant = "secondary",
  flipInRTL = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "secondary" | "plain";
  /** Directional icons (arrows, chevrons) mirror in Arabic. */
  flipInRTL?: boolean;
}) {
  const { isRTL } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        variant === "secondary" && styles.iconOutlined,
        variant === "secondary" && disabled && styles.iconDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        size={20}
        color={disabled ? colors.textFaint : colors.primary}
        style={flipInRTL && isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      />
    </Pressable>
  );
}

/** Header of a sheet or full-screen form, with an accessible close X. */
export function SheetHeader({
  title,
  subtitle,
  onClose,
  closeDisabled = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <View style={styles.sheetHeader}>
      <View style={styles.grow}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={language === "ar" ? "إغلاق" : "Close"}
        disabled={closeDisabled}
        onPress={onClose}
        style={styles.iconButton}
      >
        <X size={22} color={closeDisabled ? colors.textFaint : colors.primary} />
      </Pressable>
    </View>
  );
}

export type SheetAction = {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Short explanation, e.g. why an action is unavailable. */
  detail?: string;
};

/** Bottom action sheet: title, close X and full-width 52px action rows. */
export function ActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const { language } = useLanguage();
  // iOS cannot present the next dialog (for example Edit) while this one is still
  // closing, so the chosen action runs once the sheet has been dismissed there.
  const [queued, setQueued] = useState<(() => void) | null>(null);
  const choose = (action: SheetAction) => {
    if (Platform.OS === "ios") {
      setQueued(() => action.onPress);
      onClose();
    } else {
      onClose();
      action.onPress();
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={() => {
        queued?.();
        setQueued(null);
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "ar" ? "إخفاء" : "Dismiss"}
          onPress={onClose}
          style={styles.grow}
        />
        <SafeAreaView edges={["bottom"]} style={styles.sheet} accessibilityViewIsModal>
          <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
          <ScrollView contentContainerStyle={styles.sheetActions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={action.detail}
                disabled={action.disabled}
                onPress={() => choose(action)}
                style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
              >
                {action.icon && (
                  <action.icon
                    size={20}
                    color={
                      action.disabled
                        ? colors.textFaint
                        : action.destructive
                          ? colors.dangerText
                          : colors.primary
                    }
                  />
                )}
                <View style={styles.grow}>
                  <AppText
                    weight="semibold"
                    tone={action.disabled ? "faint" : action.destructive ? "danger" : "default"}
                  >
                    {action.label}
                  </AppText>
                  {!!action.detail && (
                    <AppText variant="caption" tone="muted">
                      {action.detail}
                    </AppText>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** A single choice from a list (for example a project), opened as a sheet. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value);
  return (
    <View style={styles.selectField}>
      <AppText variant="label" tone="strong">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ""}`}
        accessibilityHint={`${options.length}`}
        onPress={() => setOpen(true)}
        style={styles.select}
      >
        <View style={styles.grow}>
          <AppText weight="semibold" numberOfLines={2}>
            {current?.label ?? "—"}
          </AppText>
          {!!current?.detail && (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {current.detail}
            </AppText>
          )}
        </View>
        <ChevronDown size={20} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={label}
            onPress={() => setOpen(false)}
            style={styles.grow}
          />
          <SafeAreaView edges={["bottom"]} style={styles.sheet} accessibilityViewIsModal>
            <SheetHeader title={label} onClose={() => setOpen(false)} />
            <ScrollView accessibilityRole="radiogroup" contentContainerStyle={styles.sheetActions}>
              {options.map((option) => {
                const selected = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    aria-checked={selected}
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      setOpen(false);
                      onChange(option.id);
                    }}
                    style={({ pressed }) => [
                      styles.actionRow,
                      selected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.grow}>
                      <AppText weight={selected ? "semibold" : "regular"}>{option.label}</AppText>
                      {!!option.detail && (
                        <AppText variant="caption" tone="muted">
                          {option.detail}
                        </AppText>
                      )}
                    </View>
                    {selected && <Check size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Shared form dialog: header with close X, one scrolling body and a full-width footer
 * that stays above the keyboard (MobileModal's KeyboardAvoidingView) and the safe area.
 * `presentation="sheet"` docks it to the bottom for short forms.
 */
export function FormSheet({
  visible,
  title,
  subtitle,
  onClose,
  busy = false,
  footer,
  presentation = "full",
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** While saving, closing is blocked so a pending save is never abandoned. */
  busy?: boolean;
  footer?: ReactNode;
  presentation?: "full" | "sheet";
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const close = () => {
    if (!busy) onClose();
  };
  const sheet = presentation === "sheet";
  const body = (
    <PrimaryFullWidth.Provider value>
      <SheetHeader title={title} subtitle={subtitle} onClose={close} closeDisabled={busy} />
      <ScrollView
        style={sheet ? styles.sheetBody : styles.grow}
        contentContainerStyle={styles.formBody}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {children}
      </ScrollView>
      {!!footer && <View style={styles.footer}>{footer}</View>}
    </PrimaryFullWidth.Provider>
  );
  return (
    <Modal visible={visible} transparent={sheet} animationType="slide" onRequestClose={close}>
      {sheet ? (
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={language === "ar" ? "إخفاء" : "Dismiss"}
            onPress={close}
            style={styles.grow}
          />
          <SafeAreaView edges={["bottom"]} style={[styles.sheet, styles.formSheet]}>
            {body}
          </SafeAreaView>
        </View>
      ) : (
        <SafeAreaView edges={["top", "bottom"]} style={styles.full} accessibilityViewIsModal>
          {body}
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  chipTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#b9c6ad",
    backgroundColor: colors.panelStrong,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 13, lineHeight: 18 },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  countSelected: { backgroundColor: colors.onPrimary },
  countText: { fontSize: 12, lineHeight: 18 },
  track: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    borderRadius: radius.md,
    backgroundColor: colors.segmentTrack,
  },
  trackWrap: { flexWrap: "wrap" },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSelected: { backgroundColor: colors.primary },
  segmentNegative: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerButtonBorder,
  },
  segmentLabel: { fontSize: 14, lineHeight: 19 },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingStart: 14,
    paddingEnd: 2,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
  },
  searchFocused: { borderColor: colors.primary },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconOutlined: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.panelStrong,
  },
  iconDisabled: { borderColor: colors.inputBorder, backgroundColor: colors.segmentTrack },
  overlay: { flex: 1, backgroundColor: "#14201666" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#f8faf3",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  formSheet: { minHeight: "40%" },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 56,
    paddingStart: 20,
    paddingEnd: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  sheetActions: { paddingHorizontal: 12, paddingVertical: 8 },
  actionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  optionSelected: { backgroundColor: colors.primaryWash },
  pressed: { backgroundColor: colors.primaryWash },
  selectField: { gap: 7 },
  select: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    backgroundColor: colors.inputBackground,
  },
  full: { flex: 1, backgroundColor: "#fafbf7" },
  formBody: { padding: 20, gap: 16, paddingBottom: 28 },
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fafbf7",
  },
});

/**
 * Shared on/off switch with a 44px target, label and checked/disabled state.
 * Native uses the platform Switch inside the target (which owns the press). On the web,
 * react-native-web's Switch places its knob physically and detaches it from the track in
 * RTL, so a small logical-direction control is drawn instead.
 */
export function ToggleSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const toggle = () => {
    if (!disabled) onValueChange(!value);
  };
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={toggle}
      style={switchStyles.switchTarget}
    >
      {Platform.OS === "web" ? (
        <View
          style={[
            switchStyles.switchTrack,
            value && switchStyles.switchTrackOn,
            disabled && switchStyles.switchDisabled,
            // Logical alignment: "on" sits at the end edge, which mirrors in Arabic.
            { justifyContent: value ? "flex-end" : "flex-start" },
          ]}
        >
          <View style={switchStyles.switchKnob} />
        </View>
      ) : (
        <NativeSwitch
          value={value}
          disabled={disabled}
          accessible={false}
          pointerEvents="none"
          trackColor={{ true: colors.primary, false: "#c9cfc2" }}
          thumbColor="#ffffff"
          ios_backgroundColor="#c9cfc2"
        />
      )}
    </Pressable>
  );
}

const switchStyles = StyleSheet.create({
  switchTarget: { minWidth: 52, minHeight: 44, alignItems: "center", justifyContent: "center" },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c9cfc2",
  },
  switchTrackOn: { backgroundColor: colors.primary },
  switchDisabled: { opacity: 0.45 },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
  },
});
