import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
import { Group } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import GroupTile from "@/components/GroupTile";

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { groups, expenses, settlements, allUsers, addGroup } = useData();
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [pendingMembers, setPendingMembers] = useState<{ id: string; name: string; email: string }[]>([]);

  const myGroups = useMemo(
    () => groups.filter((g) => g.members.some((m) => m.id === user?.id)),
    [groups, user]
  );

  function getGroupBalance(group: Group): number {
    if (!user) return 0;
    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    const groupSettlements = settlements.filter((s) => s.groupId === group.id);
    let net = 0;
    const others = group.members.filter((m) => m.id !== user.id);
    for (const other of others) {
      net += calculatePairBalance(user.id, other.id, groupExpenses, groupSettlements);
    }
    return net;
  }

  function handleAddMember() {
    if (!memberEmail.trim()) return;
    const found = allUsers.find(
      (u) => u.email.toLowerCase() === memberEmail.toLowerCase().trim()
    );
    if (!found) {
      Alert.alert("User not found", "No account with that email exists.");
      return;
    }
    if (found.id === user?.id) {
      Alert.alert("Error", "You are already added as a member.");
      return;
    }
    if (pendingMembers.find((m) => m.id === found.id)) {
      Alert.alert("Error", "Member already added.");
      return;
    }
    setPendingMembers((prev) => [
      ...prev,
      { id: found.id, name: found.name, email: found.email },
    ]);
    setMemberEmail("");
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name.");
      return;
    }
    if (!user) return;
    const allMembers = [
      { id: user.id, name: user.name, email: user.email },
      ...pendingMembers,
    ];
    const newGroup: Group = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: groupName.trim(),
      createdBy: user.id,
      members: allMembers,
      createdAt: new Date().toISOString(),
    };
    await addGroup(newGroup);
    setShowModal(false);
    setGroupName("");
    setPendingMembers([]);
    router.push(`/groups/${newGroup.id}`);
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
        {myGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No groups yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Create a group to split expenses with roommates, travelers, or any crew
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {myGroups.map((group) => (
              <GroupTile
                key={group.id}
                group={group}
                balance={getGroupBalance(group)}
                onPress={() => router.push(`/groups/${group.id}`)}
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
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              New Group
            </Text>
            <TouchableOpacity onPress={() => { setShowModal(false); setGroupName(""); setPendingMembers([]); }}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Group Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="e.g. Roommates, Bali Trip"
                placeholderTextColor={colors.mutedForeground}
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Add Members by Email</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[styles.emailInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                  placeholder="friend@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={[styles.addMemberBtn, { backgroundColor: colors.secondary }]}
                  onPress={handleAddMember}
                >
                  <Ionicons name="add" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {pendingMembers.length > 0 && (
                <View style={styles.memberList}>
                  {pendingMembers.map((m) => (
                    <View key={m.id} style={[styles.memberChip, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.memberChipText, { color: colors.primary }]}>{m.name}</Text>
                      <TouchableOpacity onPress={() => setPendingMembers((prev) => prev.filter((p) => p.id !== m.id))}>
                        <Ionicons name="close-circle" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                activeOpacity={0.85}
              >
                <Text style={styles.createBtnText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  modalBody: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  emailRow: { flexDirection: "row", gap: 10 },
  emailInput: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  addMemberBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  memberList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  memberChipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  createBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  createBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
});
