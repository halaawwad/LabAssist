import { layoutDirection, directionProps } from "@/i18n/layoutDirection";
import { KeyboardAvoidingView, Modal, Platform, View, type ModalProps } from "react-native";
import { useLanguage } from "@/i18n";

/** One keyboard boundary for existing full-screen editors and confirmation sheets. */
export function MobileModal({ children, ...props }: ModalProps) {
  const { dir } = useLanguage();
  return (
    <Modal {...props} statusBarTranslucent={props.transparent ? true : props.statusBarTranslucent}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: props.transparent ? "transparent" : "#fff",
            ...layoutDirection(dir),
          }}
          {...directionProps(dir)}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
