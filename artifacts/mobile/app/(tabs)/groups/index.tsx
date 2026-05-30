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
import { Group } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { calculatePairBalance } from "@/utils/balanceCalculator";
import GroupTile from "@/components/GroupTile";
import PolygonBackground from "@/components/PolygonBackground";
import FriendPickerList from "@/components/FriendPickerList";
import AddFriendModal from "@/components/AddFriendModal";
import { Friend } from "@/context/DataContext";
import { formatAmount } from "@/utils/currency";

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { groups, expenses, settlements, friends, addGroup } = useData();
  const [showModal, setShowModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<"trip" | "home" | "couple" | "other">("trip");
  const [creating, setCreating] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<
    { id: string; name: string; email: string; phone?: string }[]
  >([]);

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

  const totalGroupsBalance = useMemo(() => {
    return myGroups.reduce((sum, g) => sum + getGroupBalance(g), 0);
  }, [myGroups, expenses, settlements, user]);

  const pickableFriends = useMemo(() => {
    const pendingIds = new Set(pendingMembers.map((m) => m.id));
    return friends.filter((f) => f.id !== user?.id && !pendingIds.has(f.id));
  }, [friends, user, pendingMembers]);

  function selectFriend(friend: Friend) {
    if (pendingMembers.some((m) => m.id === friend.id)) {
      Alert.alert("Error", "Member already added.");
      return;
    }
    setPendingMembers((prev) => [
      ...prev,
      {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        phone: friend.phone,
      },
    ]);
  }

  async function handleCreate() {
    if (creating) return;
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
      type: groupType,
    };

    setCreating(true);
    try {
      await addGroup(newGroup);
      setShowModal(false);
      setGroupName("");
      setGroupType("trip");
      setPendingMembers([]);
      router.push({ pathname: "/(tabs)/groups/[id]", params: { id: newGroup.id } });
    } catch (err) {
      console.error("Failed to create group:", err);
      Alert.alert("Error", "Could not create group. Please check your network and try again.");
    } finally {
      setCreating(false);
    }
  }

  const getBalanceText = () => {
    if (totalGroupsBalance === 0) {
      return "You are all settled up!";
    } else if (totalGroupsBalance > 0) {
      return `You are owed ${formatAmount(totalGroupsBalance)} overall`;
    } else {
      return `You owe ${formatAmount(Math.abs(totalGroupsBalance))} overall`;
    }
  };

  const topPad = Platform.OS === "web" ? 10 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      <PolygonBackground />

      {/* Play Store Custom Top Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
          <Text style={[styles.createGroupLink, { color: colors.primary }]}>Create group</Text>
        </TouchableOpacity>
      </View>

      {/* Play Store Balance Row & Sliders */}
      <View style={styles.balanceFilterRow}>
        <Text style={[styles.balanceText, { color: colors.foreground }]}>
          {getBalanceText()}
        </Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110, paddingTop: topPad },
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
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/groups/[id]",
                    params: { id: group.id },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* Start a new group - Hollow bordered button */}
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Start a new group</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pill-Shaped Play Store FAB */}
      <TouchableOpacity
        style={[styles.fabPill, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]}
        onPress={() => router.push("/expenses/add")}
        activeOpacity={0.9}
      >
        <Ionicons name="receipt-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.fabPillText}>Add expense</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Custom Header matching Photo */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowModal(false); setGroupName(""); setPendingMembers([]); }} activeOpacity={0.7}>
              <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitleText, { color: colors.foreground }]}>
              Create a group
            </Text>

            <TouchableOpacity onPress={handleCreate} activeOpacity={0.7} disabled={creating}>
              <Text style={[styles.doneBtnText, { color: creating ? colors.mutedForeground : colors.primary }]}>
                {creating ? "..." : "Done"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              {/* Profile/Input Row */}
              <View style={styles.profileInputRow}>
                {/* Dashed Camera square block */}
                <TouchableOpacity style={[styles.cameraSquare, { borderColor: colors.border }]} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={24} color={colors.mutedForeground} />
                  <Ionicons name="add" size={10} color={colors.mutedForeground} style={styles.cameraAddPlus} />
                </TouchableOpacity>

                {/* Right side single underline text input */}
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Group name</Text>
                  <TextInput
                    style={[styles.underlineInput, { borderBottomColor: colors.primary, color: colors.foreground }]}
                    value={groupName}
                    onChangeText={setGroupName}
                    autoFocus
                    placeholder="Enter name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>

              {/* Group Type Label */}
              <Text style={[styles.typeLabel, { color: colors.mutedForeground }]}>Type</Text>

              {/* Horizontal Row of 4 touchable Type Cards */}
              <View style={styles.typesRow}>
                {[
                  { id: "trip", label: "Trip", icon: "airplane-outline" },
                  { id: "home", label: "Home", icon: "home-outline" },
                  { id: "couple", label: "Couple", icon: "heart-outline" },
                  { id: "other", label: "Other", icon: "list-outline" },
                ].map((item) => {
                  const isSelected = groupType === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.typeCard,
                        { borderColor: isSelected ? colors.primary : colors.border },
                        isSelected && { backgroundColor: colors.secondary + "22" },
                      ]}
                      onPress={() => setGroupType(item.id as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={26}
                        color={isSelected ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.typeCardText,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Add Members from friends */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 32 }]}>
                Add friends to this trip
              </Text>

              <FriendPickerList
                friends={pickableFriends}
                selectedIds={pendingMembers.map((m) => m.id)}
                onSelect={selectFriend}
                onAddFriend={() => setShowAddFriendModal(true)}
              />

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
            </View>
          </ScrollView>
        </View>
      </Modal>

      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 4,
  },
  createGroupLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  balanceFilterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  balanceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  filterBtn: {
    padding: 4,
  },
  content: { paddingHorizontal: 20, gap: 14 },
  list: { gap: 10 },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: "transparent",
  },
  outlineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  fabPill: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  modalTitleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  doneBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  modalBody: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  profileInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  cameraSquare: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  cameraAddPlus: {
    position: "absolute",
    bottom: 16,
    right: 16,
  },
  inputWrapper: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: "center",
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 4,
  },
  underlineInput: {
    height: 38,
    borderBottomWidth: 1.5,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    paddingBottom: 4,
  },
  typeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginVertical: 8,
  },
  typesRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  typeCard: {
    flex: 1,
    height: 76,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  typeCardText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 },
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
  memberList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  memberChipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
