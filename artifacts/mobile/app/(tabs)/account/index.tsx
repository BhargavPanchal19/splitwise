import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import PolygonBackground from "@/components/PolygonBackground";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfileDetails } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSignOut() {
    if (Platform.OS === "web") {
      const confirmSignOut = window.confirm("Are you sure you want to sign out?");
      if (confirmSignOut) {
        await signOut();
      }
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  function openEditModal() {
    setEditName(user?.name ?? "");
    setEditPhone(user?.phone ?? "");
    setShowEditModal(true);
  }

  function handlePhoneChange(text: string) {
    setEditPhone(text.replace(/\D/g, "").slice(0, 10));
  }

  async function handleSaveChanges() {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    if (editPhone.trim() && editPhone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number.");
      return;
    }
    setSaving(true);
    try {
      await updateProfileDetails(editName.trim(), editPhone.trim());
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      <PolygonBackground />

      {/* Play Store Custom Top Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Large Left-Aligned Screen Title */}
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Account</Text>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Play Store Style Profile Section */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <View style={{ flex: 1, backgroundColor: "#E65A4B" }} />
              <View style={{ flex: 1, backgroundColor: "#FE7D6A" }} />
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: "#333" }]}>
              <Ionicons name="camera" size={10} color="#fff" />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.name ?? "Bhargav Panchal"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {user?.email ?? "bhargavpnchal19@gmail.com"}
            </Text>
            {user?.phone ? (
              <Text style={[styles.profilePhone, { color: colors.mutedForeground, fontSize: 13, marginTop: 2 }]}>
                {user.phone}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Scan Code List Item */}
        <View style={styles.listSection}>
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            onPress={() => router.push("/friends/scan")}
          >
            <Ionicons name="qr-code-outline" size={22} color={colors.foreground} style={styles.listIcon} />
            <Text style={[styles.listText, { color: colors.foreground }]}>Scan code</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Preferences Header & Section */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Preferences</Text>

        <View style={styles.listSection}>
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={colors.foreground} style={styles.listIcon} />
            <Text style={[styles.listText, { color: colors.foreground }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.foreground} style={styles.listIcon} />
            <Text style={[styles.listText, { color: colors.foreground }]}>Security</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push("/account/appearance")}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={22} color={colors.foreground} style={styles.listIcon} />
            <Text style={[styles.listText, { color: colors.foreground }]}>Appearance</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.destructive }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} style={{ marginRight: 8 }} />
          <Text style={[styles.signOutBtnText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal (GORGEOUS FORM SHEET DESIGN) */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Edit Profile
            </Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)} disabled={saving}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.mutedForeground}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="Enter phone number"
                placeholderTextColor={colors.mutedForeground}
                value={editPhone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address (Read-Only)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.mutedForeground, opacity: 0.7 }]}
                value={user?.email}
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveChangesBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveChanges}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveChangesBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 4,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  content: { paddingHorizontal: 20, gap: 12 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    position: "relative",
    marginRight: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    flexDirection: "row",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  profilePhone: {
    fontFamily: "Inter_400Regular",
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  listSection: {
    borderRadius: 12,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  listIcon: {
    marginRight: 14,
    width: 24,
    textAlign: "center",
  },
  listText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  divider: {
    height: 0.8,
    marginLeft: 38,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 24,
    backgroundColor: "transparent",
  },
  signOutBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  modalBody: { paddingHorizontal: 20, paddingTop: 10 },
  inputGroup: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  saveChangesBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveChangesBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
