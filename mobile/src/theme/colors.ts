// LabAssist light palette, taken from the web apps' CSS variables
// (frontend/supervisor/src/index.css, frontend/workshop/src/index.css, frontend/student/src/styles.css).
import type { ViewStyle } from "react-native";
export const colors = {
  // Surfaces
  background: "#eee8dc", // --cream: page background on supervisor and student
  surface: "#fbfaf7", // --surface (workshop)
  surfaceWarm: "#f6f4ef", // --surface-warm (workshop)
  card: "#fffaf2", // --card (student)
  creamDeep: "#ded4c5", // --cream-deep, also the student --input
  beige: "#e7dfd0", // --beige (workshop)

  // Glass panels: the web adds a backdrop blur, which the mobile app leaves out.
  panel: "rgba(255, 255, 255, 0.62)", // --panel (workshop)
  panelStrong: "rgba(255, 255, 255, 0.8)", // --panel-strong (workshop)
  stroke: "rgba(255, 255, 255, 0.75)", // --stroke (workshop)

  // Brand
  primary: "#526443", // --olive
  primaryDark: "#3f4f35", // --olive-dark
  primaryMid: "#647857", // --olive-mid (supervisor)
  primarySoft: "#839276", // --olive-soft, also the student --ring
  primaryPale: "#dfe8d9", // --olive-pale (supervisor), the student --secondary
  primaryWash: "#edf0e5", // --olive-wash (workshop)
  onPrimary: "#ffffff",

  // Text
  text: "#0d1528", // --ink
  textStrong: "#2d3442", // .field-label (workshop)
  textMuted: "#646b78", // --muted
  textFaint: "#8a909a", // --faint (workshop)

  // Lines and inputs
  line: "rgba(18, 24, 38, 0.08)", // --line (workshop)
  inputBorder: "rgba(18, 24, 38, 0.12)", // .input (workshop)
  inputBackground: "#ffffff",
  focusRing: "rgba(82, 100, 67, 0.15)", // .input:focus (workshop)
  segmentTrack: "rgba(18, 24, 38, 0.05)", // .segmented (workshop)

  // Buttons (workshop .btn-*)
  softButton: "#e6e9dc",
  softButtonPressed: "#dce1cf",
  softButtonBorder: "rgba(82, 100, 67, 0.16)",
  ghostButton: "rgba(255, 255, 255, 0.75)",
  ghostButtonBorder: "rgba(18, 24, 38, 0.08)",
  dangerButtonPressed: "#f9e0da",
  dangerButtonBorder: "rgba(224, 87, 74, 0.16)",

  // Status: for danger, warning and success only, never as decoration
  danger: "#ed5a4a", // --red (supervisor)
  dangerText: "#d4402f", // --red-text (workshop)
  dangerSoft: "#fcede9", // --red-soft (workshop)
  warning: "#ef7a38", // --orange (supervisor)
  warningText: "#c46700", // --orange-text (supervisor)
  warningSoft: "#fff1de", // --orange-soft (supervisor)
  success: "#2f8a3a", // --present (workshop)
  successSoft: "#dfe8d9",

  // Soft tints (student)
  softBlue: "#deebf8",
  softRose: "#fbe3dc",
  softAmber: "#f9e5d5",

  // Person avatar tints (supervisor): identity only, never UI accents
  avatarBlue: "#1679db",
  avatarBlueSoft: "#d9ecff",
  avatarViolet: "#5c45dc",
  avatarVioletSoft: "#e7e0ff",
  avatarGreen: "#526443",
  avatarGreenSoft: "rgba(131, 146, 118, 0.24)",

  // Progress
  track: "rgba(13, 21, 40, 0.08)", // .bar-track (supervisor)
  ringStart: "#a6bd83", // dashboard progress ring gradient (supervisor)
  ringMid: "#64875a",
  ringEnd: "#34552c",
} as const;

export type ColorName = keyof typeof colors;

// CSS gradient strings for the `backgroundImage` style.
export const gradients = {
  // --progress-gradient; the RTL version runs the other way, as on the web.
  progressLtr: `linear-gradient(90deg, ${colors.primarySoft}, ${colors.primaryMid}, ${colors.primary})`,
  progressRtl: `linear-gradient(270deg, ${colors.primarySoft}, ${colors.primaryMid}, ${colors.primary})`,
  // .stat-card.is-highlighted (supervisor)
  highlight: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 45%, ${colors.primaryMid} 75%, ${colors.primarySoft} 100%)`,
} as const;
export function gradientStyle(value: string): ViewStyle {
  const webStyle: ViewStyle & { backgroundImage: string } = { backgroundImage: value };
  return webStyle;
}
