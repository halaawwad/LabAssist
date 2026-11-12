import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, View } from "react-native";
import { Camera, ImagePlus } from "lucide-react-native";
import { AppText, Button } from "./index";
import { useCopy } from "./MobileKit";
import { persistPickedFile } from "@/lib/files";
import { colors } from "@/theme";
export function ProjectPhoto({ projectId }: { projectId: string }) {
  const t = useCopy();
  const [photo, setPhoto] = useState("");
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("labassist.project-photo." + projectId)
      .then((value) => {
        if (active) setPhoto(value ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [projectId]);
  const choose = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t(
            "Allow photo access to choose a project photo.",
            "اسمح بالوصول للصور لاختيار صورة المشروع.",
          ),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled) return;
      const uri = await persistPickedFile(result.assets[0].uri, "project.jpg");
      await AsyncStorage.setItem("labassist.project-photo." + projectId, uri);
      setPhoto(uri);
    } catch {
      Alert.alert(t("Could not save the project photo.", "تعذر حفظ صورة المشروع."));
    }
  };
  return (
    <View style={{ gap: 12 }}>
      {photo ? (
        <Image
          accessibilityLabel={t("Project photo", "صورة المشروع")}
          source={{ uri: photo }}
          style={{ width: "100%", aspectRatio: 1.65, borderRadius: 22 }}
        />
      ) : (
        <View
          style={{
            minHeight: 185,
            borderRadius: 22,
            backgroundColor: colors.primaryWash,
            borderWidth: 1,
            borderColor: "#cad7c2",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 20,
          }}
        >
          <ImagePlus color={colors.primary} size={34} />
          <AppText weight="semibold">{t("Your project, your picture", "مشروعك، صورتك")}</AppText>
          <AppText variant="caption" tone="muted">
            {t("Prototype, sketch, or a work in progress", "نموذج، مخطط، أو خطوة قيد الإنجاز")}
          </AppText>
          <Camera size={18} color={colors.primary} />
        </View>
      )}
      <Button
        title={
          photo
            ? t("Change project photo", "تغيير صورة المشروع")
            : t("Add project photo", "إضافة صورة المشروع")
        }
        variant="soft"
        onPress={choose}
      />
    </View>
  );
}
