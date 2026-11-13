import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cpu,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { AppText, LanguageToggle } from "@/components";
import { useLanguage } from "@/i18n";
import { usePreferences } from "@/state/Preferences";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { router } from "@/native/router";
const roles = [
  {
    id: "student",
    en: "Student",
    ar: "طالب",
    account: "noor@demo.com",
    icon: GraduationCap,
    detail: "Projects, circuits & learning",
    detailAr: "المشاريع والدوائر والتعلّم",
  },
  {
    id: "supervisor",
    en: "Supervisor",
    ar: "مشرف",
    account: "1024",
    icon: UserRound,
    detail: "Teams, reports & feedback",
    detailAr: "الفرق والتقارير والملاحظات",
  },
  {
    id: "workshop",
    en: "Workshop Manager",
    ar: "مسؤول الورشة",
    account: "10001",
    icon: Wrench,
    detail: "Workshop, attendance & tools",
    detailAr: "الورشة والحضور والأدوات",
  },
  {
    id: "department",
    en: "Department Head",
    ar: "رئيس القسم",
    account: "head@demo.com",
    icon: ShieldCheck,
    detail: "Accounts & team assignments",
    detailAr: "الحسابات وتوزيع الفرق",
  },
];
export default function NativeLogin() {
  const { selectRole } = useWorkspace(),
    { language } = useLanguage(),
    { preferences } = usePreferences();
  const ar = language === "ar";
  const copy = (en: string, arabic: string) => (ar ? arabic : en);
  const [role, setRole] = useState("student"),
    [account, setAccount] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [picker, setPicker] = useState(false);
  const glow = useRef(new Animated.Value(0.35)).current,
    passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (!preferences.motion) {
      glow.setValue(0.7);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glow, preferences.motion]);
  const selected = roles.find((r) => r.id === role)!,
    RoleIcon = selected.icon;
  function login() {
    if (account.trim().toLowerCase() !== selected.account || password !== "Noor123!") {
      setError(
        copy(
          "Check your sign-in details and selected role.",
          "تأكّد من بيانات الدخول والدور المختار.",
        ),
      );
      return;
    }
    setError("");
    if (role === "department") router.replace("/native/department" as import("expo-router").Href);
    else {
      selectRole(role as "student" | "supervisor" | "workshop");
      router.replace(
        (role === "student"
          ? "/native"
          : `/native/${role}/dashboard`) as import("expo-router").Href,
      );
    }
  }
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          <View style={[s.top, ar && s.reverse]}>
            <View style={s.brand}>
              <View style={s.logo}>
                <Cpu size={22} color="#f6f7ec" />
              </View>
              <AppText weight="bold" style={s.brandText}>
                LabAssist
              </AppText>
            </View>
            <LanguageToggle compact />
          </View>
          <View
            style={s.hero}
            accessibilityLabel={copy("Electronics workbench illustration", "رسم طاولة إلكترونيات")}
          >
            <Svg width="100%" height="100%" viewBox="0 0 350 210" style={StyleSheet.absoluteFill}>
              <Circle cx={265} cy={105} r={120} fill="#405b43" />
              <Circle cx={265} cy={105} r={88} fill="#4b6547" />
              <Path
                d="M0 62 H55 L82 89 H140 M350 151 H296 L272 175 H215 M0 164 H64 L86 142 H145 M306 0 V34 L280 60"
                fill="none"
                stroke="#a5bd88"
                strokeWidth={1.5}
                opacity={0.55}
              />
              {[
                ["55", "62"],
                ["64", "164"],
                ["296", "151"],
                ["306", "34"],
              ].map(([cx, cy]) => (
                <Circle key={cx} cx={cx} cy={cy} r={3} fill="#cbdaac" />
              ))}
              <Rect x={165} y={169} width={135} height={5} rx={3} fill="#182e27" opacity={0.45} />
            </Svg>
            <View style={s.heroCopy}>
              <AppText style={s.eyebrow}>{copy("A LITTLE SPARK.", "شرارة فكرة.")}</AppText>
              <AppText weight="bold" style={s.heroTitle}>
                {copy("Big ideas\nstart here.", "أفكار كبيرة\nتبدأ من هون.")}
              </AppText>
              <View style={s.heroPill}>
                <Zap size={12} color="#d2dfaa" />
                <AppText style={s.heroPillText}>
                  {copy("BUILD · CONNECT · LEARN", "ابنِ · وصّل · تعلّم")}
                </AppText>
              </View>
            </View>
            <Image
              source={require("../../../assets/catalog/arduino-uno.png")}
              resizeMode="contain"
              style={s.board}
            />
            <View style={s.sensor}>
              <Image
                source={require("../../../assets/catalog/hc-sr04.png")}
                style={{ width: 58, height: 43 }}
                resizeMode="contain"
              />
            </View>
            <Animated.View style={[s.light, { opacity: glow }]}>
              <View style={s.lightCore} />
            </Animated.View>
            <View style={s.connection}>
              <Check size={13} color="#42583d" />
              <AppText style={{ fontSize: 10, color: "#42583d" }}>
                {copy("Connected", "متّصل")}
              </AppText>
            </View>
          </View>
          <View style={s.form}>
            <AppText variant="title" style={s.welcome}>
              {copy("Your next idea awaits.", "فكرتك الجايّة بتستناك.")}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 14 }}>
              {copy("Sign in and pick up where you left off.", "سجّل دخولك وكمّل من وين وقفت.")}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy("Choose your role", "اختيار الدور")}
              onPress={() => setPicker(true)}
              style={[s.role, ar && s.reverse]}
            >
              <View style={s.roleIcon}>
                <RoleIcon size={21} color="#536a45" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={s.small}>{copy("SIGNING IN AS", "الدخول بصفة")}</AppText>
                <AppText weight="semibold">{ar ? selected.ar : selected.en}</AppText>
              </View>
              <ChevronDown size={18} color="#617057" />
            </Pressable>
            <View style={{ gap: 9 }}>
              <AppText variant="label">
                {role === "student"
                  ? copy("University email", "الإيميل الجامعي")
                  : role === "department"
                    ? copy("Email", "الإيميل")
                    : copy("University number", "الرقم الجامعي")}
              </AppText>
              <View style={[s.inputBox, !!error && s.invalid, ar && s.reverse]}>
                {role === "student" || role === "department" ? (
                  <Mail size={19} color="#7a886f" />
                ) : (
                  <UserRound size={19} color="#7a886f" />
                )}
                <TextInput
                  accessibilityLabel={copy("Account", "الحساب")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={
                    role === "supervisor" || role === "workshop" ? "number-pad" : "email-address"
                  }
                  autoComplete="username"
                  value={account}
                  onChangeText={(v) => {
                    setAccount(v);
                    setError("");
                  }}
                  placeholder={
                    role === "student"
                      ? "s12345678@stu.najah.edu"
                      : role === "supervisor"
                        ? "1234"
                        : role === "workshop"
                          ? "12345"
                          : "name@najah.edu"
                  }
                  placeholderTextColor="#8b9483"
                  style={s.input}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>
            <View style={{ gap: 9 }}>
              <AppText variant="label">{copy("Password", "كلمة المرور")}</AppText>
              <View style={[s.inputBox, !!error && s.invalid, ar && s.reverse]}>
                <LockKeyhole size={19} color="#7a886f" />
                <TextInput
                  ref={passwordRef}
                  accessibilityLabel={copy("Password", "كلمة المرور")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  secureTextEntry={!visible}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError("");
                  }}
                  placeholder={copy("Enter your password", "أدخل كلمة المرور")}
                  placeholderTextColor="#8b9483"
                  style={[s.input, { textAlign: ar ? "right" : "left" }]}
                  returnKeyType="go"
                  onSubmitEditing={login}
                />
                <Pressable
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={
                    visible
                      ? copy("Hide password", "إخفاء كلمة المرور")
                      : copy("Show password", "إظهار كلمة المرور")
                  }
                  onPress={() => setVisible(!visible)}
                >
                  {visible ? (
                    <EyeOff size={20} color="#617057" />
                  ) : (
                    <Eye size={20} color="#617057" />
                  )}
                </Pressable>
              </View>
            </View>
            {!!error && (
              <AppText tone="danger" accessibilityRole="alert" style={{ fontSize: 13 }}>
                {error}
              </AppText>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={login}
              style={({ pressed }) => [s.submit, pressed && { opacity: 0.85 }, ar && s.reverse]}
            >
              <AppText weight="semibold" style={{ color: "#fff", fontSize: 16 }}>
                {copy("Log in", "تسجيل الدخول")}
              </AppText>
              <ArrowRight
                size={20}
                color="#dce6cc"
                style={ar ? { transform: [{ rotate: "180deg" }] } : undefined}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAccount(selected.account);
                setPassword("Noor123!");
                setError("");
              }}
              style={s.demo}
            >
              <AppText style={{ fontSize: 13, color: "#60734e" }}>
                {copy("Try with demo details", "جرّب بيانات الدخول التجريبية")}
              </AppText>
            </Pressable>
          </View>
          <View style={s.footer}>
            <View style={s.dot} />
            <AppText style={{ fontSize: 11, color: "#87917e" }}>
              {copy("One workspace. Every part of your journey.", "مساحة واحدة. لكل خطوة بمشروعك.")}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={picker}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(false)}
      >
        <View style={s.modal}>
          <Pressable
            accessibilityLabel={copy("Close role chooser", "إغلاق اختيار الدور")}
            style={{ flex: 1 }}
            onPress={() => setPicker(false)}
          />
          <SafeAreaView edges={["bottom"]} style={s.sheet}>
            <View style={[s.top, ar && s.reverse]}>
              <AppText variant="heading">
                {copy("Choose your workspace", "اختار مساحة عملك")}
              </AppText>
              <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setPicker(false)}>
                <X color="#526443" size={22} />
              </Pressable>
            </View>
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === r.id }}
                  onPress={() => {
                    if (role !== r.id) {
                      setRole(r.id);
                      setAccount("");
                      setPassword("");
                      setVisible(false);
                      setError("");
                    }
                    setPicker(false);
                  }}
                  style={[
                    s.roleChoice,
                    role === r.id && { backgroundColor: "#e9efdf", borderColor: "#a9ba96" },
                    ar && s.reverse,
                  ]}
                >
                  <View style={s.roleIcon}>
                    <Icon color="#526443" size={23} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText weight="semibold">{ar ? r.ar : r.en}</AppText>
                    <AppText style={{ fontSize: 12, color: "#7c8872" }}>
                      {ar ? r.detailAr : r.detail}
                    </AppText>
                  </View>
                  {role === r.id && <Check color="#526443" size={20} />}
                </Pressable>
              );
            })}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f0" },
  content: { flexGrow: 1, padding: 22, gap: 22, paddingBottom: 20 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  reverse: { flexDirection: "row-reverse" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#526443",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 21, color: "#2b3e2b" },
  hero: { height: 206, borderRadius: 28, backgroundColor: "#2c4637", overflow: "hidden" },
  heroCopy: { position: "absolute", left: 20, top: 26, gap: 12, zIndex: 2 },
  eyebrow: { color: "#c1d3aa", fontSize: 9, letterSpacing: 1.8 },
  heroTitle: { color: "#f5f5e7", fontSize: 26, lineHeight: 32 },
  heroPill: { flexDirection: "row", gap: 5, alignItems: "center", marginTop: 6 },
  heroPillText: { color: "#c9d5bb", fontSize: 8, letterSpacing: 0.8 },
  board: {
    position: "absolute",
    right: -9,
    top: 43,
    width: 170,
    height: 136,
    transform: [{ rotate: "-18deg" }],
  },
  sensor: {
    position: "absolute",
    right: 12,
    top: 14,
    width: 67,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#f2f3e9",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "9deg" }],
  },
  light: {
    position: "absolute",
    right: 122,
    top: 145,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#dcf2a64d",
    alignItems: "center",
    justifyContent: "center",
  },
  lightCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dbf4a0" },
  connection: {
    position: "absolute",
    bottom: 15,
    right: 17,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: "#e5eed5",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  form: { gap: 18 },
  welcome: { fontSize: 25, lineHeight: 33, letterSpacing: -0.7 },
  role: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dfe5d7",
    backgroundColor: "#eef2e6",
  },
  roleIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#f9fbf2",
    alignItems: "center",
    justifyContent: "center",
  },
  small: { fontSize: 9, letterSpacing: 1, color: "#809071" },
  inputBox: {
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    minHeight: 54,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#dde2d5",
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 14,
    color: "#293a2d",
  },
  invalid: { borderColor: "#b46d68" },
  submit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#526443",
    borderRadius: 17,
    minHeight: 55,
    paddingHorizontal: 21,
    marginTop: 3,
  },
  demo: { alignItems: "center", paddingVertical: 5 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: "auto",
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#9aa987" },
  modal: { flex: 1, backgroundColor: "#16221966" },
  sheet: {
    backgroundColor: "#f7f8f0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 23,
    gap: 13,
  },
  roleChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e7da",
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#fff",
  },
});

