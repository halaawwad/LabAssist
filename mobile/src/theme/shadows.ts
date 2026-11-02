import type { ViewStyle } from "react-native";

// CSS box-shadow strings are supported on iOS and Android by the new architecture,
// so these match the web values exactly.
export const shadows = {
  panel: { boxShadow: "0 10px 30px rgba(60, 60, 45, 0.06)" }, // --shadow (workshop)
  soft: { boxShadow: "0 4px 14px rgba(60, 60, 45, 0.05)" }, // --soft-shadow (workshop)
  raised: { boxShadow: "0 12px 32px rgba(55, 65, 50, 0.07)" }, // --shadow (supervisor)
  primaryButton: { boxShadow: "0 6px 14px rgba(82, 100, 67, 0.22)" }, // .btn-primary
  focusRing: { boxShadow: "0 0 0 3px rgba(82, 100, 67, 0.15)" }, // .input:focus
} satisfies Record<string, ViewStyle>;
