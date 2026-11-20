import { KeyboardAvoidingView, Modal, Platform, View, type ModalProps } from "react-native";
import { directionStyle, useLanguage } from "@/i18n";
import { PrimaryFullWidth } from "./Button";

/**
 * One keyboard boundary for editors, forms and sheets. iOS pads for the keyboard;
 * Android (edge-to-edge, where the window no longer resizes) shrinks the height.
 * Primary actions inside a dialog span the full width.
 */
export function MobileModal({ children, ...props }: ModalProps) {
  const { dir } = useLanguage();
  return (
    <Modal
      {...props}
      // A closed sheet must never take the next tap. A modal dismissed with an animation keeps
      // its window until the animation ends (iOS blocks touches meanwhile; react-native-web
      // waits for animationend), so dismissal is instant. Opening still animates. Android
      // rebuilds its dialog when this prop changes, so it keeps its own dismissal.
      animationType={!props.visible && Platform.OS !== "android" ? "none" : props.animationType}
      statusBarTranslucent={props.transparent ? true : props.statusBarTranslucent}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: props.transparent ? "transparent" : "#fff",
            ...directionStyle(dir),
          }}
        >
          <PrimaryFullWidth.Provider value>{children}</PrimaryFullWidth.Provider>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
