import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  keyboardType?: "default" | "phone-pad" | "email-address" | "number-pad";
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void | Promise<void>;
};

export default function TextPromptModal({
  visible,
  title,
  message,
  placeholder,
  initialValue,
  keyboardType = "default",
  confirmText = "Add",
  cancelText = "Cancel",
  onCancel,
  onConfirm,
}: Props) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (visible) setValue(initialValue ?? "");
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "web" ? "none" : "fade"}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {!!message && (
            <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
          )}

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            keyboardType={keyboardType}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost, { borderColor: colors.border }]}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => onConfirm(value.trim())}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "700" },
  message: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "600" },
});

