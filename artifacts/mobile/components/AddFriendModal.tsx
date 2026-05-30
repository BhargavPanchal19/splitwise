import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after a request is sent successfully */
  onSent?: () => void;
};

export default function AddFriendModal({ visible, onClose, onSent }: Props) {
  const colors = useColors();
  const { sendFriendReq } = useData();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setIdentifier("");
  }, [visible]);

  async function handleSend() {
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const res = await sendFriendReq(identifier.trim());
      if (res.success) {
        setIdentifier("");
        onClose();
        onSent?.();
        Alert.alert("Success", res.message);
      } else {
        Alert.alert("Error", res.message);
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Add Friend</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Phone or Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.foreground,
              },
            ]}
            placeholder="Phone number or email"
            placeholderTextColor={colors.mutedForeground}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="default"
            autoFocus
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            They must have an account. Once they accept your request, they will appear in your
            friends list and you can add them to trips.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Sending..." : "Send Friend Request"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  body: { paddingHorizontal: 20, gap: 12 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
