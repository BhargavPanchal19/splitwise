import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import FriendTile from "@/components/FriendTile";

export default function FriendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { friends, expenses, settlements, allUsers, addFriend } = useData();
  const [showModal, setShowModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const friendsWithBalance = useMemo(
    () =>
      friends.map((f) => ({
        friend: f,
        balance: user
          ? calculatePairBalance(user.id, f.id, expenses, settlements)
          : 0,
      })),
    [friends, user, expenses, settlements]
  );

  async function handleAddFriend() {
    if (!searchEmail.trim()) return;
    const found = allUsers.find(
      (u) => u.email.toLowerCase() === searchEmail.toLowerCase().trim()
    );
    if (!found) {
      Alert.alert("User not found", "No account with that email exists. They need to sign up first.");
      return;
    }
    if (found.id === user?.id) {
      Alert.alert("Error", "You cannot add yourself as a friend.");
      return;
    }
    await addFriend({ id: found.id, name: found.name, email: found.email });
    setShowModal(false);
    setSearchEmail("");
    Alert.alert("Success", `${found.name} added as a friend!`);
  }

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100, paddingTop: topPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {friendsWithBalance.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No friends yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Add friends by their email address to start splitting expenses
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {friendsWithBalance.map(({ friend, balance }) => (
              <FriendTile
                key={friend.id}
                friend={friend}
                balance={balance}
                onPress={() => router.push(`/friends/${friend.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 90 }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Add Friend
            </Text>
            <TouchableOpacity onPress={() => { setShowModal(false); setSearchEmail(""); }}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Friend's Email
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="friend@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={searchEmail}
              onChangeText={setSearchEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Your friend needs to have a Splitwise account first.
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddFriend}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 8 },
  list: { gap: 8 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
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
  modalBody: { paddingHorizontal: 20, gap: 12 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  addBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
